# Endpoints And Fields

## Endpoints

- `GET /fina/competitions?page=<n>&pageSize=100`
  - resolve competition ID from competition name
- `GET /fina/competitions/{competitionId}/events`
  - resolve event GUID from event name
- `GET /fina/events/{eventId}`
  - fetch unit results and splits
- `GET /fina/records/SW?recordCode=WR|OR&gender=M|F|X&pool=LCM|SCM`
  - fetch WR/OR rows
  - use directly only when the record date is on or before the target event date
- `GET /fina/rankings/swimming/report/pdf?...&timesMode=ALL_TIMES&endDate=YYYY-MM-DD`
  - official World Aquatics rankings PDF
  - used as historical evidence when current record rows are newer than the target event date
- `GET /fina/rankings/swimming?gender=<M|F|X>&distance=<n>&stroke=<enum>&poolConfiguration=<LCM|SCM>&pageSize=<n>`
  - athlete identity matching
- `GET /fina/athletes/{athleteId}/results`
  - derive `age_at_event`
  - derive `major_awards`
  - derive `olympic_appearances`
  - derive `personal_record`
- `https://olympics.com/OG2024/pdf/OG2024/SWM/...pdf`
  - official Paris 2024 swimming result-book PDF path

## Main Output Fields

### `meta`

- competition identity
- event identity
- selected phase
- pool code
- gender code
- `historical_semantics`
- `target_event_date`
- `target_event_utc`
- source endpoints
- record provenance context

### `records`

- `WR`
- `OR`

Each record row may include:

- `time`
- `holder`
- `country`
- `competition`
- `date`
- `source_url`
- `source_kind`
- `artifact_path`
- `artifact_sha256`

### `athletes[]`

- `rank`
- `lane`
- `name`
- `country`
- `age_at_event`
- `personal_record`
- `reaction_time`
- `final_time`
- `splits[]`
- `athlete_history`

### `athlete_history`

- `major_awards.olympic_games`
- `major_awards.world_championships`
- `olympic_appearances`
- `sources`

## Historical Semantics

Default contract: historical fields are resolved `as_of_event`.

- `records.WR/OR`
  - keep when record date `<= target_event_date`
  - otherwise try official Olympics PDF evidence
  - otherwise try official World Aquatics rankings PDF evidence
  - otherwise leave unresolved
- `major_awards`
  - count only medal rows before the target event time
- `olympic_appearances`
  - count only Olympic cycles before the target event time
- `personal_record`
  - select the athlete's fastest official result for the same event before the target event time
- `age_at_event`
  - use `AthleteResultAge` from the matched target-event result row
