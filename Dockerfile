FROM python:3
WORKDIR /usr/src/PROJECT4
COPY . .
RUN pip install -r requirements.txt
CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000"]