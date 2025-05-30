from collections import OrderedDict
from typing import Any

from django import forms

from sentry.eventstore.models import GroupEvent
from sentry.issues.grouptype import GroupCategory
from sentry.models.group import Group
from sentry.rules import EventState
from sentry.rules.filters import EventFilter
from sentry.types.condition_activity import ConditionActivity

CATEGORY_CHOICES = OrderedDict([(f"{gc.value}", str(gc.name).lower()) for gc in GroupCategory])


class IssueCategoryForm(forms.Form):
    value = forms.ChoiceField(choices=list(CATEGORY_CHOICES.items()))


class IssueCategoryFilter(EventFilter):
    id = "sentry.rules.filters.issue_category.IssueCategoryFilter"
    form_fields = {"value": {"type": "choice", "choices": list(CATEGORY_CHOICES.items())}}
    rule_type = "filter/event"
    label = "The issue's category is equal to {value}"
    prompt = "The issue's category is ..."

    def _passes(self, group: Group) -> bool:
        try:
            value: GroupCategory = GroupCategory(int(self.get_option("value")))
        except (TypeError, ValueError):
            return False

        if group:
            return value == group.issue_category or value == group.issue_category_v2

        return False

    def passes(self, event: GroupEvent, state: EventState, **kwargs: Any) -> bool:
        return self._passes(event.group)

    def passes_activity(
        self, condition_activity: ConditionActivity, event_map: dict[str, Any]
    ) -> bool:
        try:
            group = Group.objects.get_from_cache(id=condition_activity.group_id)
        except Group.DoesNotExist:
            return False

        return self._passes(group)

    def render_label(self) -> str:
        value = self.data["value"]
        title = CATEGORY_CHOICES.get(value)
        group_category_name = title.title() if title else ""
        return self.label.format(value=group_category_name)

    def get_form_instance(self) -> IssueCategoryForm:
        return IssueCategoryForm(self.data)
