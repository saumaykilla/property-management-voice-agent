# Service Catalog Page

Date: 2026-03-24

## Route

- `/catalog`

## Purpose

Let staff manage the agency-wide service catalog and understand whether the assistant’s knowledge base is healthy.

## Layout

- page title and explanation
- current catalog card
- upload module
- ingestion timeline
- search preview area

## Sections

### Current Catalog Card

Shows:
- current file name
- uploaded date
- ingestion status
- chunk count
- last successful processing time

### Upload Module

- drag-and-drop PDF area
- replace catalog action
- upload progress
- validation messages

### Ingestion Timeline

Stages:
- uploaded
- parsing
- chunking
- embedded
- searchable

This gives staff confidence that the assistant’s knowledge base is real and not magic.

### Search Preview

A simple preview tool:
- input issue description
- return top matched chunks

Purpose:
- operational confidence
- debugging the catalog content

## Visual Notes

- The page should feel more like a knowledge console than a file manager.
- Show chunks and retrieval results in clean document cards rather than raw JSON.

## Empty State

- explain that the assistant uses this agency-wide catalog to decide how to respond to maintenance issues
- CTA: `Upload first catalog`
