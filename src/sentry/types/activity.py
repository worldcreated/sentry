from enum import Enum


class ActivityType(Enum):
    SET_RESOLVED = 1
    SET_UNRESOLVED = 2
    SET_IGNORED = 3
    SET_PUBLIC = 4
    SET_PRIVATE = 5
    SET_REGRESSION = 6
    CREATE_ISSUE = 7
    NOTE = 8
    FIRST_SEEN = 9
    RELEASE = 10
    ASSIGNED = 11
    UNASSIGNED = 12
    SET_RESOLVED_IN_RELEASE = 13
    MERGE = 14
    SET_RESOLVED_BY_AGE = 15
    SET_RESOLVED_IN_COMMIT = 16
    DEPLOY = 17
    NEW_PROCESSING_ISSUES = 18
    UNMERGE_SOURCE = 19
    UNMERGE_DESTINATION = 20
    SET_RESOLVED_IN_PULL_REQUEST = 21

    # The user has reprocessed the group, so events may have moved to new groups
    REPROCESS = 22
    MARK_REVIEWED = 23
    AUTO_SET_ONGOING = 24
    SET_ESCALATING = 25

    SET_PRIORITY = 26
    DELETED_ATTACHMENT = 27


# Warning: This must remain in this EXACT order.
CHOICES = tuple(
    (i.value, i.name.lower())
    for i in [
        ActivityType.SET_RESOLVED,  # 1
        ActivityType.SET_RESOLVED_BY_AGE,  # 15
        ActivityType.SET_RESOLVED_IN_RELEASE,  # 13
        ActivityType.SET_RESOLVED_IN_COMMIT,  # 16
        ActivityType.SET_RESOLVED_IN_PULL_REQUEST,  # 21
        ActivityType.SET_UNRESOLVED,  # 2
        ActivityType.SET_IGNORED,  # 3
        ActivityType.SET_PUBLIC,  # 4
        ActivityType.SET_PRIVATE,  # 5
        ActivityType.SET_REGRESSION,  # 6
        ActivityType.CREATE_ISSUE,  # 7
        ActivityType.NOTE,  # 8
        ActivityType.FIRST_SEEN,  # 9
        ActivityType.RELEASE,  # 10
        ActivityType.ASSIGNED,  # 11
        ActivityType.UNASSIGNED,  # 12
        ActivityType.MERGE,  # 14
        ActivityType.DEPLOY,  # 17
        ActivityType.NEW_PROCESSING_ISSUES,  # 18
        ActivityType.UNMERGE_SOURCE,  # 19
        ActivityType.UNMERGE_DESTINATION,  # 20
        ActivityType.REPROCESS,  # 22
        ActivityType.MARK_REVIEWED,  # 23
        ActivityType.AUTO_SET_ONGOING,  # 24
        ActivityType.SET_ESCALATING,  # 25
        ActivityType.SET_PRIORITY,  # 26
        ActivityType.DELETED_ATTACHMENT,  # 27
    ]
)


STATUS_CHANGE_ACTIVITY_TYPES = (
    ActivityType.SET_RESOLVED,
    ActivityType.SET_UNRESOLVED,
    ActivityType.SET_IGNORED,
    ActivityType.SET_REGRESSION,
    ActivityType.SET_RESOLVED_IN_RELEASE,
    ActivityType.SET_RESOLVED_BY_AGE,
    ActivityType.SET_RESOLVED_IN_COMMIT,
    ActivityType.SET_RESOLVED_IN_PULL_REQUEST,
    ActivityType.SET_ESCALATING,
)
