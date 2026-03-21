{{/*
Common labels
*/}}
{{- define "acme.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "acme.backend.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}-backend
{{ include "acme.labels" . }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "acme.frontend.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}-frontend
{{ include "acme.labels" . }}
{{- end }}

{{/*
Postgres selector labels
*/}}
{{- define "acme.postgres.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}-postgres
{{ include "acme.labels" . }}
{{- end }}
