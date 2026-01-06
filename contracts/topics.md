# Topics & Payload

Topic prefix : `classroom/<deviceId>/`

| Topic       | Sens / Contenu                | Émis par | Payload        |
| ----------- | ----------------------------- | -------- | -------------- |
| `telemetry` | mesures périodiques           | ESP32    | JSON telemetry |
| `events`    | évènements (boot, ack, alert) | ESP32    | JSON event     |
| `cmd`       | commandes (LED, Interval)     | server   | JSON cmd       |
| `status`    | status (online/offline)       | ESP32    | JSON status    |
