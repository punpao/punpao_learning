# Airflow 3 + an isolated dbt virtualenv.
# dbt lives in its own venv (/opt/dbt-venv) so its dependencies can never conflict with
# Airflow's pinned constraints. Call it from DAGs as /opt/dbt-venv/bin/dbt (env: DBT_VENV).
ARG AIRFLOW_IMAGE=apache/airflow:3.4.0-python3.12
FROM ${AIRFLOW_IMAGE}

USER root
RUN mkdir -p /opt/dbt-venv && chown airflow:0 /opt/dbt-venv
USER airflow

# 1) extra packages for Airflow's own environment (keep Airflow pinned so pip can't move it)
COPY requirements-airflow.txt /tmp/requirements-airflow.txt
RUN pip install --no-cache-dir "apache-airflow==${AIRFLOW_VERSION}" -r /tmp/requirements-airflow.txt

# 2) dbt in a separate venv
COPY requirements-dbt.txt /tmp/requirements-dbt.txt
RUN python -m venv /opt/dbt-venv \
 && /opt/dbt-venv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/dbt-venv/bin/pip install --no-cache-dir -r /tmp/requirements-dbt.txt \
 && /opt/dbt-venv/bin/dbt --version
