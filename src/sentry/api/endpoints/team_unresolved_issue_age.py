from datetime import UTC, datetime, timedelta

from django.db.models import Case, Count, Q, TextField, Value, When
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from sentry import features
from sentry.api.api_owners import ApiOwner
from sentry.api.api_publish_status import ApiPublishStatus
from sentry.api.base import region_silo_endpoint
from sentry.api.bases.team import TeamEndpoint
from sentry.api.helpers.environments import get_environments
from sentry.models.group import Group, GroupStatus
from sentry.models.team import Team

buckets = (
    ("< 1 hour", timedelta(hours=1)),
    ("< 4 hour", timedelta(hours=4)),
    ("< 12 hour", timedelta(hours=12)),
    ("< 1 day", timedelta(days=1)),
    ("< 1 week", timedelta(weeks=1)),
    ("< 4 week", timedelta(weeks=4)),
    ("< 24 week", timedelta(weeks=24)),
    ("< 1 year", timedelta(weeks=52)),
)
OLDEST_LABEL = "> 1 year"


@region_silo_endpoint
class TeamUnresolvedIssueAgeEndpoint(TeamEndpoint):
    owner = ApiOwner.ISSUES
    publish_status = {
        "GET": ApiPublishStatus.PRIVATE,
    }

    def get(self, request: Request, team: Team) -> Response:
        """
        Return a time bucketed list of how old unresolved issues are.
        """
        if not features.has("organizations:team-insights", team.organization, actor=request.user):
            return Response({"detail": "You do not have the insights feature enabled"}, status=400)

        environments = [e.id for e in get_environments(request, team.organization)]
        group_environment_filter = (
            Q(groupenvironment__environment_id=environments[0]) if environments else Q()
        )

        current_time = timezone.now()
        unresolved_ages = list(
            Group.objects.filter_to_team(team)
            .filter(
                group_environment_filter,
                status=GroupStatus.UNRESOLVED,
                last_seen__gt=datetime.now(UTC) - timedelta(days=90),
            )
            .annotate(
                bucket=Case(
                    *[
                        When(first_seen__gt=current_time - delta, then=Value(label))
                        for (label, delta) in buckets
                    ],
                    default=Value(OLDEST_LABEL),
                    output_field=TextField(),
                )
            )
            .values("bucket")
            .annotate(count=Count("id"))
        )
        unresolved_ages_dict = {
            unresolved["bucket"]: unresolved["count"] for unresolved in unresolved_ages
        }
        for label, _ in buckets:
            unresolved_ages_dict.setdefault(label, 0)
        unresolved_ages_dict.setdefault(OLDEST_LABEL, 0)
        return Response(unresolved_ages_dict)
