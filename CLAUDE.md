# CLAUDE.md

# Nexin Enterprise EV Platform

## Mission

This repository is the complete re-platforming of the legacy backend.

Legacy Project:

Nexin_Whitelable_Backend

New Project:

Nest_Nexin_BACKEND_Replatform

This is NOT a rewrite.

This is NOT a redesign.

This is a production-grade migration to a modern enterprise architecture.

The goal is to preserve 100% functional compatibility while improving scalability, maintainability, observability, security, and developer experience.

------------------------------------------------------------

# Primary Goal

Always migrate existing functionality.

Never redesign business logic.

Never invent new business rules.

Never remove legacy functionality unless explicitly instructed.

When implementing any feature:

1. Read the legacy implementation.
2. Understand the business logic.
3. Preserve API behavior.
4. Preserve request body.
5. Preserve response body.
6. Preserve validation.
7. Preserve database behavior.
8. Improve only architecture.

------------------------------------------------------------

# Legacy Project Rules

The legacy project is the source of truth.

Location

../Nexin_Whitelable_Backend

For every implementation:

Locate

Controllers

Routes

Services

Models

Middleware

Validators

Helpers

Utilities

Business Logic

Reproduce behavior exactly.

If behavior is unclear,

STOP

and ask before implementing.

------------------------------------------------------------

# Technology Stack

Framework

NestJS Latest

Language

TypeScript Strict

Database

MySQL

ORM

TypeORM

Authentication

JWT

Passport

Redis

Redis

Queue

BullMQ

Realtime

WebSocket

Protocols

OCPP 1.6J

OCPI 2.2.1

Validation

class-validator

class-transformer

Logging

nestjs-pino

Observability

OpenTelemetry

Testing

Vitest

Supertest

Deployment

Docker

PM2

------------------------------------------------------------

# Enterprise Architecture

Project Structure

apps/

api/

ocpp-gateway/

workers/

scheduler/

modules/

auth/

clients/

users/

chargers/

connectors/

locations/

sessions/

transactions/

tariffs/

wallet/

payments/

analytics/

notifications/

reports/

firmware/

settings/

ocpi/

libs/

database/

config/

logger/

redis/

queue/

cache/

tenancy/

telemetry/

events/

security/

common/

integrations/

aws/

razorpay/

phonepe/

zoho/

firebase/

mqtt/

smtp/

maps/

TypeORM/

tests/

docs/

scripts/

Never create new top-level folders without approval.

------------------------------------------------------------

# Module Architecture

Every business domain must follow exactly this structure.

Example

modules/

chargers/

controllers/

admin-chargers.controller.ts

vendor-chargers.controller.ts

fleet-chargers.controller.ts

app-chargers.controller.ts

repositories/

charger.repository.ts

services/

charger.service.ts

charger-command.service.ts

dto/

interfaces/

entities/

constants/

events/

guards/

decorators/

utils/

chargers.module.ts

index.ts

------------------------------------------------------------

# Layering

Always follow

Controller

↓

Service

↓

Repository

↓

TypeORM

Never allow

Controller

↓

Repository

Controller

↓

TypeORM

Service

↓

TypeORM

Repositories own ALL database access.

------------------------------------------------------------

# Repository Rules

Repositories are responsible for

Database Queries

Pagination

Sorting

Filtering

Transactions

Caching

TypeORM Includes

TypeORM Selects

Database Optimization

Repositories must never contain business logic.

------------------------------------------------------------

# Service Rules

Services contain

Business Logic

Validation

Calculations

Workflow

Events

Queue Jobs

Notifications

External Integrations

Services never contain TypeORM queries.

------------------------------------------------------------

# Controller Rules

Controllers only

Receive Request

Validate DTO

Call Service

Return Response

Never

Query Database

Calculate Tariffs

Send Emails

Access Redis

Business Logic

------------------------------------------------------------

# DTO Rules

Every endpoint

must use DTOs.

Validation

class-validator

Transformation

class-transformer

Never validate inside services.

Global ValidationPipe only.

------------------------------------------------------------

# Multi Tenancy

Every tenant-owned table contains

clientId

Tenant Context

nestjs-cls

Tenant must be resolved once.

Never manually pass clientId through every method.

Use TypeORM middleware/extensions.

Cross-tenant queries are forbidden.

------------------------------------------------------------

# Authentication

Separate authentication for

Super Admin

Admin

Vendor

Fleet

Driver App

Public Web

OCPI

Never mix authentication strategies.

Never reuse JWT guards for OCPI.

------------------------------------------------------------

# API Compatibility

The frontend is already integrated.

Do NOT change

Routes

Request Bodies

Response Bodies

Status Codes

Field Names

Pagination

Authentication

Error Messages

Without explicit approval.

------------------------------------------------------------

# Route Organization

Maintain

v1/super-admin

v1/admin

v1/vendor

v1/fleet

v1/auth

v1/web

v1/ocpi/cpo

v1/ocpi/emsp

v1/webhooks

Business modules own controllers.

Actor routes belong inside the business module.

------------------------------------------------------------

# TypeORM Rules

Always

Use Transactions

Use Select over Include

Avoid N+1

Use Pagination

Use Soft Delete

Use createdAt

Use updatedAt

Use deletedAt

Never use findMany without pagination.

------------------------------------------------------------

# Redis Rules

Redis is used for

Caching

Session State

OCPP Registry

Rate Limiting

Distributed Locks

Pub/Sub

Never store distributed state in memory.

------------------------------------------------------------

# BullMQ Rules

BullMQ is used for

Remote Start

Remote Stop

Firmware

Email

Notifications

Wallet Recovery

Settlement

Retries

Sweeper Jobs

Never use

setTimeout

setInterval

Map

for production workflows.

------------------------------------------------------------

# OCPP Rules

OCPP runs inside

apps/ocpp-gateway

Never inside REST API.

Every packet

Store Database

Log

Trace

Every charger

Stored in Redis

Commands

RemoteStart

RemoteStop

Reset

Unlock

Firmware

Configuration

Diagnostics

Must be asynchronous.

Retry failed commands.

Timeout every request.

------------------------------------------------------------

# OCPI Rules

Follow OCPI 2.2.1.

Separate

Versions

Credentials

Locations

Sessions

CDRs

Tokens

Commands

Tariffs

EMSP

CPO

Authentication is independent from JWT.

------------------------------------------------------------

# Payments

Always Adapter Pattern.

Supported

Razorpay

PhonePe

Zoho

Future gateways

must plug into adapters.

Never couple business logic to providers.

------------------------------------------------------------

# Logging

Every

HTTP Request

OCPP Packet

OCPI Request

Payment Callback

Redis Event

Queue Job

must be logged.

------------------------------------------------------------

# Coding Standards

Strict TypeScript.

No any.

Prefer readonly.

Constructor Injection.

Early Returns.

Small Functions.

Composition.

Interfaces.

SOLID Principles.

Meaningful Names.

No duplicate code.

------------------------------------------------------------

# Performance

Optimize for

10,000+

Chargers

Millions

OCPP Messages

Large Multi Tenant Deployments

Horizontal Scaling

Redis

BullMQ

Connection Pooling

Optimized TypeORM Queries

------------------------------------------------------------

# Testing

Every module requires

Unit Tests

Integration Tests

Critical flows

Wallet

Payments

Tariffs

Sessions

Transactions

OCPP

OCPI

must be covered.

------------------------------------------------------------

# AI Workflow

Before writing code

Understand legacy implementation.

Understand architecture.

Understand schema.

Understand DTO.

Implement Repository.

Implement Service.

Implement Controller.

Write Tests.

Never skip these steps.

------------------------------------------------------------

# AI Restrictions

Never delete code without approval.

Never rename APIs.

Never rename TypeORM models.

Never rename database columns.

Never change responses.

Never change business logic.

Never create placeholder implementations.

Never leave TODO instead of working code.

Always generate production-ready code.

------------------------------------------------------------

# Migration Order

Foundation

Authentication

Clients

Users

Chargers

Connectors

Locations

Tariffs

Wallet

Payments

Sessions

Transactions

Analytics

Notifications

Reports

Firmware

OCPI

OCPP

------------------------------------------------------------

# Enterprise Principles

Always prioritize

Scalability

Maintainability

Reliability

Security

Observability

Performance

Backward Compatibility

Consistency

Clean Architecture

Developer Experience

When uncertain,

STOP

Ask questions

Do not assume business logic.

This repository is intended to become a production-grade enterprise EV charging platform capable of serving thousands of charging stations and millions of charging sessions.