# Generated by Django 5.2.1 on 2025-05-21 16:29

import datetime

import django.contrib.postgres.fields
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import bitfield.models
import sentry.db.models.fields.bounded
import sentry.db.models.fields.foreignkey
import sentry.db.models.fields.hybrid_cloud_foreign_key
from sentry.new_migrations.migrations import CheckedMigration


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production.
    # This should only be used for operations where it's safe to run the migration after your
    # code has deployed. So this should not be used for most operations that alter the schema
    # of a table.
    # Here are some things that make sense to mark as post deployment:
    # - Large data migrations. Typically we want these to be run manually so that they can be
    #   monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   run this outside deployments so that we don't block them. Note that while adding an index
    #   is a schema change, it's completely safe to run the operation after the code has deployed.
    # Once deployed, run these manually via: https://develop.sentry.dev/database-migrations/#migration-deployment

    is_post_deployment = True

    replaces = [
        ("hybridcloud", "0001_add_api_key_replica"),
        ("hybridcloud", "0002_add_slug_reservation_replica_model"),
        ("hybridcloud", "0003_add_scopes_to_api_key_replica"),
        ("hybridcloud", "0004_add_cache_version"),
        ("hybridcloud", "0005_add_missing_org_integration_scope"),
        ("hybridcloud", "0006_add_apitokenreplica"),
        ("hybridcloud", "0007_add_orgauthtokenreplica"),
        ("hybridcloud", "0008_add_externalactorreplica"),
        ("hybridcloud", "0009_make_user_id_optional_for_slug_reservation_replica"),
        ("hybridcloud", "0010_add_webhook_payload"),
        ("hybridcloud", "0011_add_hybridcloudapitoken_index"),
        ("hybridcloud", "0012_apitoken_increase_token_length"),
        ("hybridcloud", "0013_add_orgauthtokenreplica_token_index"),
        ("hybridcloud", "0014_apitokenreplica_add_hashed_token"),
        ("hybridcloud", "0015_apitokenreplica_hashed_token_index"),
        ("hybridcloud", "0016_add_control_cacheversion"),
        ("hybridcloud", "0017_add_scoping_organization_apitokenreplica"),
        ("hybridcloud", "0018_add_alert_and_member_invite_scopes_to_sentry_apps"),
        ("hybridcloud", "0019_add_provider_webhook_payload"),
        ("hybridcloud", "0020_fix_scope_list_type"),
        ("hybridcloud", "0021_django_arrayfield_scope_list"),
    ]

    initial = True

    checked = False  # This is an initial migration and can take locks

    dependencies = [
        ("sentry", "0001_squashed_0904_onboarding_task_project_id_idx"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ControlCacheVersion",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("key", models.CharField(max_length=64, unique=True)),
                ("version", models.PositiveBigIntegerField(default=0)),
            ],
            options={
                "db_table": "hybridcloud_controlcacheversion",
            },
        ),
        migrations.CreateModel(
            name="RegionCacheVersion",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("key", models.CharField(max_length=64, unique=True)),
                ("version", models.PositiveBigIntegerField(default=0)),
            ],
            options={
                "db_table": "hybridcloud_regioncacheversion",
            },
        ),
        migrations.CreateModel(
            name="ApiKeyReplica",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                (
                    "scopes",
                    bitfield.models.BitField(
                        [
                            "project:read",
                            "project:write",
                            "project:admin",
                            "project:releases",
                            "team:read",
                            "team:write",
                            "team:admin",
                            "event:read",
                            "event:write",
                            "event:admin",
                            "org:read",
                            "org:write",
                            "org:admin",
                            "member:read",
                            "member:write",
                            "member:admin",
                            "org:integrations",
                            "alerts:read",
                            "alerts:write",
                            "member:invite",
                        ],
                        default=None,
                    ),
                ),
                (
                    "scope_list",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.TextField(), default=list, size=None
                    ),
                ),
                (
                    "apikey_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.ApiKey", db_index=True, on_delete="CASCADE"
                    ),
                ),
                ("label", models.CharField(blank=True, max_length=64)),
                ("key", models.CharField(max_length=32)),
                (
                    "status",
                    sentry.db.models.fields.bounded.BoundedPositiveIntegerField(db_index=True),
                ),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now)),
                ("allowed_origins", models.TextField(blank=True, null=True)),
                (
                    "organization",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.organization"
                    ),
                ),
            ],
            options={
                "db_table": "hybridcloud_apikeyreplica",
            },
        ),
        migrations.CreateModel(
            name="OrganizationSlugReservationReplica",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                (
                    "organization_slug_reservation_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.organizationslugreservation",
                        db_index=True,
                        on_delete="CASCADE",
                        unique=True,
                    ),
                ),
                ("slug", models.SlugField(unique=True)),
                (
                    "organization_id",
                    sentry.db.models.fields.bounded.BoundedBigIntegerField(db_index=True),
                ),
                (
                    "user_id",
                    sentry.db.models.fields.bounded.BoundedBigIntegerField(
                        db_index=True, null=True
                    ),
                ),
                ("region_name", models.CharField(max_length=48)),
                (
                    "reservation_type",
                    sentry.db.models.fields.bounded.BoundedBigIntegerField(default=0),
                ),
                (
                    "date_added",
                    models.DateTimeField(default=django.utils.timezone.now, editable=False),
                ),
            ],
            options={
                "db_table": "hybridcloud_organizationslugreservationreplica",
                "unique_together": {("organization_id", "reservation_type")},
            },
        ),
        migrations.CreateModel(
            name="WebhookPayload",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("mailbox_name", models.CharField()),
                ("provider", models.CharField(blank=True, null=True)),
                ("region_name", models.CharField()),
                ("integration_id", models.BigIntegerField(null=True)),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "schedule_for",
                    models.DateTimeField(
                        default=datetime.datetime(2016, 8, 1, 0, 0, tzinfo=datetime.UTC)
                    ),
                ),
                ("attempts", models.IntegerField(default=0)),
                ("request_method", models.CharField()),
                ("request_path", models.CharField()),
                ("request_headers", models.TextField()),
                ("request_body", models.TextField()),
            ],
            options={
                "db_table": "hybridcloud_webhookpayload",
                "indexes": [
                    models.Index(fields=["mailbox_name"], name="hybridcloud_mailbox_7bde0b_idx"),
                    models.Index(fields=["schedule_for"], name="hybridcloud_schedul_ee7ad7_idx"),
                    models.Index(fields=["provider"], name="webhookpayload_provider_idx"),
                    models.Index(
                        fields=["mailbox_name", "id"], name="webhookpayload_mailbox_id_idx"
                    ),
                    models.Index(
                        models.ExpressionWrapper(
                            models.Case(
                                models.When(provider="stripe", then=models.Value(1)),
                                default=models.Value(10),
                                output_field=models.IntegerField(),
                            ),
                            output_field=models.IntegerField(),
                        ),
                        models.F("id"),
                        name="webhookpayload_priority_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="ApiTokenReplica",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                (
                    "scopes",
                    bitfield.models.BitField(
                        [
                            "project:read",
                            "project:write",
                            "project:admin",
                            "project:releases",
                            "team:read",
                            "team:write",
                            "team:admin",
                            "event:read",
                            "event:write",
                            "event:admin",
                            "org:read",
                            "org:write",
                            "org:admin",
                            "member:read",
                            "member:write",
                            "member:admin",
                            "org:integrations",
                            "alerts:read",
                            "alerts:write",
                            "member:invite",
                        ],
                        default=None,
                    ),
                ),
                (
                    "scope_list",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.TextField(), default=list, size=None
                    ),
                ),
                (
                    "application_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.ApiApplication", db_index=True, null=True, on_delete="CASCADE"
                    ),
                ),
                ("application_is_active", models.BooleanField(default=False)),
                (
                    "user_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.User", db_index=True, on_delete="CASCADE"
                    ),
                ),
                (
                    "apitoken_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.ApiToken", db_index=True, on_delete="CASCADE"
                    ),
                ),
                ("hashed_token", models.CharField(max_length=128, null=True)),
                ("token", models.CharField(max_length=71)),
                ("expires_at", models.DateTimeField(null=True)),
                ("allowed_origins", models.TextField(blank=True, null=True)),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "scoping_organization_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.Organization", db_index=True, null=True, on_delete="CASCADE"
                    ),
                ),
                (
                    "organization",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="sentry.organization",
                    ),
                ),
            ],
            options={
                "db_table": "hybridcloud_apitokenreplica",
                "indexes": [
                    models.Index(fields=["token"], name="hybridcloud_token_1b7b55_idx"),
                    models.Index(fields=["hashed_token"], name="hybridcloud_hashed__a93a8b_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ExternalActorReplica",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("externalactor_id", sentry.db.models.fields.bounded.BoundedPositiveIntegerField()),
                (
                    "team_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.Team", db_index=True, null=True, on_delete="CASCADE"
                    ),
                ),
                (
                    "organization_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.Organization", db_index=True, on_delete="CASCADE"
                    ),
                ),
                ("provider", sentry.db.models.fields.bounded.BoundedPositiveIntegerField()),
                ("external_name", models.TextField()),
                ("external_id", models.TextField(null=True)),
                (
                    "integration",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.integration"
                    ),
                ),
                (
                    "user",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "hybridcloud_externalactorreplica",
                "unique_together": {
                    ("organization_id", "provider", "external_name", "team_id"),
                    ("organization_id", "provider", "external_name", "user_id"),
                },
            },
        ),
        migrations.CreateModel(
            name="OrgAuthTokenReplica",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                (
                    "orgauthtoken_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.OrgAuthToken", db_index=True, on_delete="CASCADE"
                    ),
                ),
                ("token_hashed", models.TextField()),
                ("name", models.CharField(max_length=255)),
                (
                    "scope_list",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.TextField(), default=list, size=None
                    ),
                ),
                (
                    "created_by_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.User", blank=True, db_index=True, null=True, on_delete="SET_NULL"
                    ),
                ),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now)),
                ("date_deactivated", models.DateTimeField(blank=True, null=True)),
                (
                    "organization",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.organization"
                    ),
                ),
            ],
            options={
                "db_table": "hybridcloud_orgauthtokenreplica",
                "indexes": [
                    models.Index(fields=["token_hashed"], name="hybridcloud_token_h_9871e6_idx")
                ],
            },
        ),
    ]
