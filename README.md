# alerting-app-example

This is a training repository showing an example implementation of a healthcare app following EDA, DDD and event sourcing.

# Requirements

![Requirements](./docs/images/requirements.jpg)

## Context

- Janek owns a company called “JanMed” (previously “JanWątroba”)
- Janek has a network of ten laboratories in Poland
- The laboratories have technicians and equipment necessary for liver examinations
- Janek wants to digitize the process of monitoring patients’ health and lay off part of the staff

## Acceptance criterias

- **AC1.** My system receives the patient’s test results: alanine aminotransferase (ALT – U/L) and liver fibrosis level on the METAVIR scale F0–F4 from elastography.
- **AC2.** ALT above 35 U/L for women / 45 U/L for men generates a small alert.
- **AC3.** Fibrosis levels F1, F2, F3, and F4 generate a small alert.
- **AC4.** After three consecutive alarming ALT–fibrosis result pairs, taken at intervals of at least one month, we calculate the liver cancer risk level using the formula:**(patient age / 70) \* (median fibrosis / 4) \* (mean ALT / \[last ALT result + first ALT result\])**
- **AC5.** If the calculated liver cancer risk level is greater than 0.3, we generate a large alert.
- **AC6.** A doctor may resolve a large alert → this resolves all small alerts.
- **AC7.** A doctor may resolve small alerts, but when a large alert appears, small alerts cannot be resolved.
- **AC8.** No new alerts can be generated if a large alert has not been resolved.
- **AC9**. The price for an ALT test is 30 PLN.
- **AC10**. The price for elastography is 300 PLN.
- **AC11**. Elderly patients receive a 10% discount.
- **AC12**. Patients with a small alert receive a 5% discount.
- **AC13**. Patients with a big alert receive a 15% discount.
- **AC14**. Small-alert and big-alert discounts do not combine with each other.
- **AC15**. The elderly discount can be combined with either the small-alert or big-alert discount.

# Setup

## Dependencies

Run docker compose to start needed dependencies:

```bash
docker compose up -d
```
