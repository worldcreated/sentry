from __future__ import annotations

import logging
import threading
import weakref
from collections.abc import Callable, Collection, Generator, Mapping, MutableMapping, Sequence
from contextlib import contextmanager
from enum import IntEnum, auto
from typing import Any

from django.conf import settings
from django.db import models, router
from django.db.models import Model
from django.db.models.fields import Field
from django.db.models.manager import Manager as DjangoBaseManager
from django.db.models.signals import class_prepared, post_delete, post_init, post_save

from sentry.db.models.manager.base_query_set import BaseQuerySet
from sentry.db.models.manager.types import M
from sentry.db.models.query import create_or_update
from sentry.db.postgres.transactions import django_test_transaction_water_mark
from sentry.silo.base import SiloLimit
from sentry.utils.cache import cache
from sentry.utils.hashlib import md5_text

logger = logging.getLogger("sentry")

_local_cache = threading.local()
_local_cache_generation = 0
_local_cache_enabled = False


def flush_manager_local_cache() -> None:
    global _local_cache
    _local_cache = threading.local()


class ModelManagerTriggerCondition(IntEnum):
    QUERY = auto()
    SAVE = auto()
    DELETE = auto()


ModelManagerTriggerAction = Callable[[type[Model]], None]


def __prep_value(model: Any, key: str, value: Model | int | str) -> str:
    val = value
    if isinstance(value, Model):
        val = value.pk
    return str(val)


def __prep_key(model: Any, key: str) -> str:
    if key == "pk":
        return str(model._meta.pk.name)
    return key


def make_key(model: Any, prefix: str, kwargs: Mapping[str, Model | int | str]) -> str:
    kwargs_bits = []
    for k, v in sorted(kwargs.items()):
        k = __prep_key(model, k)
        v = __prep_value(model, k, v)
        kwargs_bits.append(f"{k}={v}")
    kwargs_bits_str = ":".join(kwargs_bits)

    return f"{prefix}:{model.__name__}:{md5_text(kwargs_bits_str).hexdigest()}"


_base_manager_base = DjangoBaseManager.from_queryset(BaseQuerySet, "_base_manager_base")


class BaseManager(_base_manager_base[M]):
    lookup_handlers = {"iexact": lambda x: x.upper()}
    use_for_related_fields = True

    _queryset_class = BaseQuerySet

    def __init__(
        self,
        *args: Any,
        cache_fields: Sequence[str] | None = None,
        cache_ttl: int = 60 * 5,
        **kwargs: Any,
    ) -> None:
        #: Model fields for which we should build up a cache to be used with
        #: Model.objects.get_from_cache(fieldname=value)`.
        #:
        #: Note that each field by its own needs to be a potential primary key
        #: (uniquely identify a row), so for example organization slug is ok,
        #: project slug is not.
        self.cache_fields = cache_fields if cache_fields is not None else ()
        self.cache_ttl = cache_ttl
        self._cache_version: str | None = kwargs.pop("cache_version", None)
        self.__local_cache = threading.local()

        self._triggers: dict[
            object, tuple[ModelManagerTriggerCondition, ModelManagerTriggerAction]
        ] = {}
        super().__init__(*args, **kwargs)

    @staticmethod
    @contextmanager
    def local_cache() -> Generator[None]:
        """Enables local caching for the entire process."""
        global _local_cache_enabled, _local_cache_generation
        if _local_cache_enabled:
            raise RuntimeError("nested use of process global local cache")
        _local_cache_enabled = True
        try:
            yield
        finally:
            _local_cache_enabled = False
            _local_cache_generation += 1

    def _get_local_cache(self) -> MutableMapping[str, M] | None:
        if not _local_cache_enabled:
            return None

        gen = _local_cache_generation
        cache_gen = getattr(_local_cache, "generation", None)

        if cache_gen != gen or not hasattr(_local_cache, "cache"):
            _local_cache.cache = {}
            _local_cache.generation = gen

        return _local_cache.cache

    def _get_cache(self) -> MutableMapping[str, Any]:
        if not hasattr(self.__local_cache, "value"):
            self.__local_cache.value = weakref.WeakKeyDictionary()

        return self.__local_cache.value

    def _set_cache(self, value: Any) -> None:
        self.__local_cache.value = value

    @property
    def cache_version(self) -> str:
        if self._cache_version is None:
            self._cache_version = md5_text(
                "&".join(sorted(f.attname for f in self.model._meta.fields))
            ).hexdigest()[:3]
        return self._cache_version

    __cache = property(_get_cache, _set_cache)

    def __getstate__(self) -> Mapping[str, Any]:
        d = self.__dict__.copy()
        # we can't serialize weakrefs
        d.pop("_BaseManager__cache", None)
        d.pop("_BaseManager__local_cache", None)
        return d

    def __setstate__(self, state: Mapping[str, Any]) -> None:
        self.__dict__.update(state)
        # TODO(typing): Basically everywhere else we set this to `threading.local()`.
        self.__local_cache = weakref.WeakKeyDictionary()  # type: ignore[assignment]

    def __class_prepared(self, sender: Any, **kwargs: Any) -> None:
        """
        Given the cache is configured, connects the required signals for invalidation.
        """
        post_save.connect(self.post_save, sender=sender, weak=False)
        post_delete.connect(self.post_delete, sender=sender, weak=False)

        if not self.cache_fields:
            return

        post_init.connect(self.__post_init, sender=sender, weak=False)
        post_save.connect(self.__post_save, sender=sender, weak=False)
        post_delete.connect(self.__post_delete, sender=sender, weak=False)

    def __cache_state(self, instance: M) -> None:
        """
        Updates the tracked state of an instance.
        """
        if instance.pk:
            self.__cache[instance] = {
                f: self.__value_for_field(instance, f) for f in self.cache_fields
            }

    def __post_init(self, instance: M, **kwargs: Any) -> None:
        """
        Stores the initial state of an instance.
        """
        self.__cache_state(instance)

    def __post_save(self, instance: M, **kwargs: Any) -> None:
        """
        Pushes changes to an instance into the cache, and removes invalid (changed)
        lookup values.
        """
        pk_name = instance._meta.pk.name
        pk_names = ("pk", pk_name)
        pk_val = instance.pk
        for key in self.cache_fields:
            if key in pk_names:
                continue
            # store pointers
            value = self.__value_for_field(instance, key)
            cache.set(
                key=self.__get_lookup_cache_key(**{key: value}),
                value=pk_val,
                timeout=self.cache_ttl,
                version=self.cache_version,
            )

        # Ensure we don't serialize the database into the cache
        db = instance._state.db
        instance._state.db = None
        # store actual object
        try:
            cache.set(
                key=self.__get_lookup_cache_key(**{pk_name: pk_val}),
                value=instance,
                timeout=self.cache_ttl,
                version=self.cache_version,
            )
        except Exception as e:
            logger.exception(str(e))
        instance._state.db = db

        # Kill off any keys which are no longer valid
        if instance in self.__cache:
            for key in self.cache_fields:
                if key not in self.__cache[instance]:
                    continue
                value = self.__cache[instance][key]
                current_value = self.__value_for_field(instance, key)
                if value != current_value:
                    cache.delete(
                        key=self.__get_lookup_cache_key(**{key: value}), version=self.cache_version
                    )

        self.__cache_state(instance)

        self._execute_triggers(ModelManagerTriggerCondition.SAVE)

    def __post_delete(self, instance: M, **kwargs: Any) -> None:
        """
        Drops instance from all cache storages.
        """
        pk_name = instance._meta.pk.name
        for key in self.cache_fields:
            if key in ("pk", pk_name):
                continue
            # remove pointers
            value = self.__value_for_field(instance, key)
            cache.delete(
                key=self.__get_lookup_cache_key(**{key: value}), version=self.cache_version
            )
        # remove actual object
        cache.delete(
            key=self.__get_lookup_cache_key(**{pk_name: instance.pk}), version=self.cache_version
        )

        self._execute_triggers(ModelManagerTriggerCondition.DELETE)

    def __get_lookup_cache_key(self, **kwargs: Any) -> str:
        return make_key(self.model, "modelcache", kwargs)

    def __value_for_field(self, instance: M, key: str) -> Any:
        """
        Return the cacheable value for a field.

        ForeignKey's will cache via the primary key rather than using an
        instance ref. This is needed due to the way lifecycle of models works
        as otherwise we end up doing wasteful queries.
        """
        if key == "pk":
            return instance.pk
        field = instance._meta.get_field(key)
        assert isinstance(field, Field), field
        return getattr(instance, field.attname)

    def contribute_to_class(self, model: type[Model], name: str) -> None:
        super().contribute_to_class(model, name)
        class_prepared.connect(self.__class_prepared, sender=model)

    @django_test_transaction_water_mark()
    def get_from_cache(
        self, use_replica: bool = settings.SENTRY_MODEL_CACHE_USE_REPLICA, **kwargs: Any
    ) -> M:
        """
        Wrapper around QuerySet.get which supports caching of the
        intermediate value.  Callee is responsible for making sure
        the cache key is cleared on save.
        """
        if not self.cache_fields:
            raise ValueError("We cannot cache this query. Just hit the database.")

        key, pk_name, value = self._get_cacheable_kv_from_kwargs(kwargs)
        if key not in self.cache_fields and key != pk_name:
            raise ValueError("We cannot cache this query. Just hit the database.")

        cache_key = self.__get_lookup_cache_key(**{key: value})
        local_cache = self._get_local_cache()

        def validate_result(inst: Any) -> M:
            if isinstance(inst, self.model) and (key != pk_name or int(value) == inst.pk):
                return inst

            if settings.DEBUG:
                raise ValueError("Unexpected value type returned from cache")
            logger.error(
                "Cache response returned invalid value",
                extra={"instance": inst, "key": key, "model": str(self.model)},
            )
            if local_cache is not None and cache_key in local_cache:
                del local_cache[cache_key]
            cache.delete(cache_key, version=self.cache_version)
            return self.using_replica().get(**kwargs) if use_replica else self.get(**kwargs)

        if local_cache is not None and cache_key in local_cache:
            return validate_result(local_cache[cache_key])

        retval = cache.get(cache_key, version=self.cache_version)
        # If we don't have a hit in the django level cache, collect
        # the result, and store it both in django and local caches.
        if retval is None:
            result = self.using_replica().get(**kwargs) if use_replica else self.get(**kwargs)
            assert result
            # Ensure we're pushing it into the cache
            self.__post_save(instance=result)
            if local_cache is not None:
                local_cache[cache_key] = result
            return validate_result(result)

        # If we didn't look up by pk we need to hit the reffed
        # key
        if key != pk_name:
            result = self.get_from_cache(**{pk_name: retval})
            if local_cache is not None:
                local_cache[cache_key] = result
            return validate_result(result)

        retval = validate_result(retval)

        kwargs = {**kwargs, "replica": True} if use_replica else {**kwargs}
        retval._state.db = router.db_for_read(self.model, **kwargs)

        return retval

    def _get_cacheable_kv_from_kwargs(self, kwargs: Mapping[str, Any]) -> tuple[str, str, int]:
        if not kwargs or len(kwargs) > 1:
            raise ValueError("We cannot cache this query. Just hit the database.")

        key, value = next(iter(kwargs.items()))
        pk_name = self.model._meta.pk.name
        if key == "pk":
            key = pk_name
        # We store everything by key references (vs instances)
        if isinstance(value, Model):
            value = value.pk
        # Kill __exact since it's the default behavior
        if key.endswith("__exact"):
            key = key.split("__exact", 1)[0]
        return key, pk_name, value

    def get_many_from_cache(self, values: Collection[str | int], key: str = "pk") -> Sequence[Any]:
        """
        Wrapper around `QuerySet.filter(pk__in=values)` which supports caching of
        the intermediate value.  Callee is responsible for making sure the
        cache key is cleared on save.

        NOTE: We can only query by primary key or some other unique identifier.
        It is not possible to e.g. run `Project.objects.get_many_from_cache([1,
        2, 3], key="organization_id")` and get back all projects belonging to
        those orgs. The length of the return value is bounded by the length of
        `values`.

        For most models, if one attempts to use a non-PK value this will just
        degrade to a DB query, like with `get_from_cache`.
        """

        pk_name = self.model._meta.pk.name

        if key == "pk":
            key = pk_name

        # Kill __exact since it's the default behavior
        if key.endswith("__exact"):
            key = key.split("__exact", 1)[0]

        if key not in self.cache_fields and key != pk_name:
            raise ValueError("We cannot cache this query. Just hit the database.")

        final_results = []
        cache_lookup_cache_keys = []
        cache_lookup_values = []

        local_cache = self._get_local_cache()
        for value in values:
            cache_key = self.__get_lookup_cache_key(**{key: value})
            result = local_cache and local_cache.get(cache_key)
            if result is not None:
                final_results.append(result)
            else:
                cache_lookup_cache_keys.append(cache_key)
                cache_lookup_values.append(value)

        if not cache_lookup_cache_keys:
            return final_results

        cache_results = cache.get_many(cache_lookup_cache_keys, version=self.cache_version)

        db_lookup_cache_keys = []
        db_lookup_values = []

        nested_lookup_cache_keys = []
        nested_lookup_values = []

        for cache_key, value in zip(cache_lookup_cache_keys, cache_lookup_values):
            cache_result = cache_results.get(cache_key)
            if cache_result is None:
                db_lookup_cache_keys.append(cache_key)
                db_lookup_values.append(value)
                continue

            # If we didn't look up by pk we need to hit the reffed key
            if key != pk_name:
                nested_lookup_cache_keys.append(cache_key)
                nested_lookup_values.append(cache_result)
                continue

            if not isinstance(cache_result, self.model):
                if settings.DEBUG:
                    raise ValueError("Unexpected value type returned from cache")
                logger.error("Cache response returned invalid value %r", cache_result)
                db_lookup_cache_keys.append(cache_key)
                db_lookup_values.append(value)
                continue

            if key == pk_name and int(value) != cache_result.pk:
                if settings.DEBUG:
                    raise ValueError("Unexpected value returned from cache")
                logger.error("Cache response returned invalid value %r", cache_result)
                db_lookup_cache_keys.append(cache_key)
                db_lookup_values.append(value)
                continue

            final_results.append(cache_result)

        if nested_lookup_values:
            nested_results = self.get_many_from_cache(nested_lookup_values, key=pk_name)
            final_results.extend(nested_results)
            if local_cache is not None:
                for nested_result in nested_results:
                    value = getattr(nested_result, key)
                    cache_key = self.__get_lookup_cache_key(**{key: value})
                    local_cache[cache_key] = nested_result

        if not db_lookup_values:
            return final_results

        cache_writes = []

        db_results = {getattr(x, key): x for x in self.filter(**{key + "__in": db_lookup_values})}
        for cache_key, value in zip(db_lookup_cache_keys, db_lookup_values):
            db_result = db_results.get(value)
            if db_result is None:
                continue  # This model ultimately does not exist

            # Ensure we're pushing it into the cache
            cache_writes.append(db_result)
            if local_cache is not None:
                local_cache[cache_key] = db_result

            final_results.append(db_result)

        # XXX: Should use set_many here, but __post_save code is too complex
        for instance in cache_writes:
            self.__post_save(instance=instance)

        return final_results

    def create_or_update(self, **kwargs: Any) -> tuple[Any, bool]:
        return create_or_update(self.model, **kwargs)

    def uncache_object(self, instance_id: int) -> None:
        pk_name = self.model._meta.pk.name
        cache_key = self.__get_lookup_cache_key(**{pk_name: instance_id})
        cache.delete(cache_key, version=self.cache_version)

    def post_save(self, *, instance: M, created: bool, **kwargs: object) -> None:  # type: ignore[misc]  # python/mypy#6178
        """
        Triggered when a model bound to this manager is saved.
        """

    def post_delete(self, instance: M, **kwargs: Any) -> None:  # type: ignore[misc]  # python/mypy#6178
        """
        Triggered when a model bound to this manager is deleted.
        """

    def get_queryset(self) -> BaseQuerySet[M]:
        """
        Returns a new QuerySet object.  Subclasses can override this method to
        easily customize the behavior of the Manager.
        """

        # TODO: This is a quick-and-dirty place to put the trigger hook that won't
        #  work for all model classes, because some custom managers override
        #  get_queryset without a `super` call.
        self._execute_triggers(ModelManagerTriggerCondition.QUERY)

        if hasattr(self, "_hints"):
            return self._queryset_class(self.model, using=self._db, hints=self._hints)
        return self._queryset_class(self.model, using=self._db)

    @contextmanager
    def register_trigger(
        self, condition: ModelManagerTriggerCondition, action: ModelManagerTriggerAction
    ) -> Generator[None]:
        """Register a callback for when an operation is executed inside the context.

        There is no guarantee whether the action will be called before or after the
        triggering operation is executed, nor whether it will or will not be called
        if the triggering operation raises an exception.

        Both the registration of the trigger and the execution of the action are NOT
        THREADSAFE. This is intended for offline use in single-threaded contexts such
        as pytest. We must add synchronization if we intend to adapt it for
        production use.
        """

        key = object()
        self._triggers[key] = (condition, action)
        try:
            yield
        finally:
            del self._triggers[key]

    def _execute_triggers(self, condition: ModelManagerTriggerCondition) -> None:
        for next_condition, next_action in self._triggers.values():
            if condition == next_condition:
                next_action(self.model)


def create_silo_limited_copy(self: BaseManager[M], limit: SiloLimit) -> BaseManager[M]:
    """Create a copy of this manager that enforces silo limitations."""

    # Dynamically create a subclass of this manager's class, adding overrides.
    cls = type(self)
    overrides = {
        "get_queryset": limit.create_override(cls.get_queryset),
        "bulk_create": limit.create_override(cls.bulk_create),
        "bulk_update": limit.create_override(cls.bulk_update),
        "create": limit.create_override(cls.create),
        "create_or_update": (
            limit.create_override(cls.create_or_update)
            if hasattr(cls, "create_or_update")
            else None
        ),
        "get_or_create": limit.create_override(cls.get_or_create),
        "post_delete": (
            limit.create_override(cls.post_delete) if hasattr(cls, "post_delete") else None
        ),
        "select_for_update": limit.create_override(cls.select_for_update),
        "update": limit.create_override(cls.update),
        "update_or_create": limit.create_override(cls.update_or_create),
        "get_from_cache": (
            limit.create_override(cls.get_from_cache) if hasattr(cls, "get_from_cache") else None
        ),
        "get_many_from_cache": (
            limit.create_override(cls.get_many_from_cache)
            if hasattr(cls, "get_many_from_cache")
            else None
        ),
    }
    manager_subclass = type(cls.__name__, (cls,), overrides)
    manager_instance = manager_subclass()

    # Ordinarily a pointer to the model class is set after the class is defined,
    # meaning we can't inherit it. Manually copy it over now.
    manager_instance.model = self.model

    # Copy over some more stuff that would be set in __init__
    # (warning: this is brittle)
    if hasattr(self, "cache_fields"):
        manager_instance.cache_fields = self.cache_fields
        manager_instance.cache_ttl = self.cache_ttl
        manager_instance._cache_version = self._cache_version
        manager_instance.__local_cache = threading.local()

    # Dynamically extend and replace the queryset class. This will affect all
    # queryset objects later returned from the new manager.
    qs_cls = manager_instance._queryset_class
    assert issubclass(qs_cls, BaseQuerySet) or issubclass(qs_cls, models.QuerySet)
    queryset_overrides = {
        "bulk_create": limit.create_override(qs_cls.bulk_create),
        "bulk_update": limit.create_override(qs_cls.bulk_update),
        "create": limit.create_override(qs_cls.create),
        "delete": limit.create_override(qs_cls.delete),
        "get_or_create": limit.create_override(qs_cls.get_or_create),
        "update": limit.create_override(qs_cls.update),
        "update_or_create": limit.create_override(qs_cls.update_or_create),
    }
    queryset_subclass = type(qs_cls.__name__, (qs_cls,), queryset_overrides)
    manager_instance._queryset_class = queryset_subclass

    return manager_instance
