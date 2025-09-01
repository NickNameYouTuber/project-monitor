FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/target/project-monitor-backend-0.1.0.jar /app/app.jar
ENV JAVA_OPTS=""
EXPOSE 8081
ENTRYPOINT ["sh", "-lc", "java $JAVA_OPTS -jar /app/app.jar"]


