{{/*
Expand the name of the chart.
*/}}
{{- define "huly.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "huly.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Secret resource name.
*/}}
{{- define "huly.secretName" -}}
{{- printf "%s-secret" (include "huly.fullname" .) }}
{{- end }}

{{/*
ConfigMap resource name.
*/}}
{{- define "huly.configName" -}}
{{- printf "%s-config" (include "huly.fullname" .) }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "huly.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: huly
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Global scheduling (nodeSelector, tolerations, affinity).
*/}}
{{- define "huly.scheduling" -}}
{{- with .Values.global.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.global.tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.global.affinity }}
affinity:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Effective MinIO enabled (disabled if storage.type == s3).
*/}}
{{- define "huly.minioEnabled" -}}
{{- if and .Values.minio.enabled (eq .Values.storage.type "minio") }}true{{- else }}false{{- end }}
{{- end }}

{{/*
Checksum annotations — triggers pod restart when secret/configmap changes.
Usage: {{- include "huly.checksumAnnotations" . | nindent 8 }}
*/}}
{{- define "huly.checksumAnnotations" -}}
checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
{{- end }}

{{/*
Init container that waits for CockroachDB to accept connections.
*/}}
{{- define "huly.waitForCockroach" -}}
{{- if .Values.cockroach.enabled }}
- name: wait-cockroach
  image: busybox:1.36
  command: ['sh', '-c', 'until nc -z cockroach 26257; do echo "waiting for cockroach..."; sleep 2; done']
{{- end }}
{{- end }}

{{/*
Init container that waits for MongoDB to accept connections.
*/}}
{{- define "huly.waitForMongodb" -}}
{{- if .Values.mongodb.enabled }}
- name: wait-mongodb
  image: busybox:1.36
  command: ['sh', '-c', 'until nc -z mongodb 27017; do echo "waiting for mongodb..."; sleep 2; done']
{{- end }}
{{- end }}

{{/*
Init container that waits for Redpanda to accept connections.
*/}}
{{- define "huly.waitForRedpanda" -}}
{{- if .Values.redpanda.enabled }}
- name: wait-redpanda
  image: busybox:1.36
  command: ['sh', '-c', 'until nc -z redpanda 9092; do echo "waiting for redpanda..."; sleep 2; done']
{{- end }}
{{- end }}

{{/*
Env var from Secret helper — reduces boilerplate.
Usage: {{- include "huly.envSecret" (dict "name" "SERVER_SECRET" "key" "SERVER_SECRET" "root" .) }}
*/}}
{{- define "huly.envSecret" -}}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ include "huly.secretName" .root }}
      key: {{ .key }}
{{- end }}

{{/*
Env var from ConfigMap helper — reduces boilerplate.
Usage: {{- include "huly.envConfig" (dict "name" "FRONT_URL" "key" "FRONT_URL" "root" .) }}
*/}}
{{- define "huly.envConfig" -}}
- name: {{ .name }}
  valueFrom:
    configMapKeyRef:
      name: {{ include "huly.configName" .root }}
      key: {{ .key }}
{{- end }}
