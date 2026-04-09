# Phase 7-8 Test Report

> Time: 2026/4/8 09:44:55
> Env: localhost:3000 (development)

## Summary

| Item | Count |
|------|-------|
| Pass | 36 |
| Fail | 0 |
| Skip | 0 |
| Total | 36 |

**Pass rate: 100%**

### 7.1 After-sales

| ID | Name | Status | Detail |
|------|------|------|------|
| C-108 | Create service ticket | PASS | id=SH1775612694848HB3S |
| C-109 | Service list | PASS | total=12, items=12 |
| C-110 | Service detail | PASS | title=N/A, status=pending |
| C-111 | Edit service | PASS | updated |
| C-112 | Service follow-up | PASS | follow-up created |
| C-112b | Get follow-ups | PASS | count=1 |
| C-113 | Service stats summary | PASS | {"total":12,"pending":8,"processing":4,"resolved":0,"closed":0} |
| C-114 | Service status->processing | PASS | status changed |
| C-114b | Operation logs | PASS | count=1 |

### 7.2 Logistics

| ID | Name | Status | Detail |
|------|------|------|------|
| C-115 | Logistics list | PASS | status=200 |
| C-116 | Logistics summary | PASS | {"pending":0,"inTransit":0,"delivered":0,"exception":0,"total":0} |
| C-117 | Status update orders | PASS | total=0 |
| C-117b | Status update summary | PASS | {"pending":0,"updated":0,"todo":0,"total":0} |
| C-118 | Logistics companies | PASS | count=9 |
| C-118b | Active companies | PASS | count=7 |
| C-119 | Logistics log | PASS | total=0 |
| C-119b | Logistics permission | PASS | {"canView":true,"canUpdate":true,"canBatchUpdate":true,"canExport":true,"role":" |
| C-120 | SF Express query | PASS | reachable, status=404 |
| C-120b | Logistics API configs | PASS | [{"id":"lac-dbl-9481d7c0","tenantId":"8a5fbe74-e0ff-4cd4-8403-b80ea748ae10","com |

### 8.1 Calls

| ID | Name | Status | Detail |
|------|------|------|------|
| C-121 | Call statistics | PASS | total=2, connected=2 |
| C-122 | Call records list | PASS | count=2 |
| C-123 | Create call record | PASS | id=call_1775612695000_12da76ef |
| C-124 | Call followups | PASS | count=0 |
| C-125 | Call config | PASS | {"userId":"2a0b0b34-b342-401a-a5a2-dffa9001594c","callMethod":"system","lineId": |
| C-126 | Call recordings | PASS | count=3 |
| C-127 | Outbound tasks | PASS | count=0 |
| C-128 | Call lines | PASS | count=0 |

### 8.2 SMS

| ID | Name | Status | Detail |
|------|------|------|------|
| C-129 | SMS templates | PASS | count=0 |
| C-130 | SMS records | PASS | data={"records":[],"total":0} |
| C-131 | SMS statistics | PASS | {"pendingTemplates":0,"pendingSms":0,"todaySent":0,"totalSent":0} |

### 8.3 Messages

| ID | Name | Status | Detail |
|------|------|------|------|
| C-133 | System messages | PASS | count=0 |
| C-134 | Message stats | PASS | {"totalAnnouncements":0,"publishedAnnouncements":0,"notificationChannelCount":0, |
| C-135 | Mark all read | PASS | all messages marked as read |
| C-136 | Published announcements | PASS | count=1 |
| C-137 | Message subscriptions | PASS | count=0 |
| C-138 | Notification configs | PASS | count=0 |

