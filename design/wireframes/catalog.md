# Wireframe: Catalog

Date: 2026-03-24

## Route

- `/catalog`

## User Job

Understand whether the agency knowledge base is healthy and replace or inspect it confidently.

## Desktop Layout

```text
+-----------+-----------------------------------------------------------------------+
| SIDE RAIL | TOP BAR                                                               |
|           | Service catalog                                                       |
+-----------+------------------------------------+----------------------------------+
|           | CURRENT CATALOG CARD              | SEARCH PREVIEW WORKBENCH         |
|           | file name                         | issue input                      |
|           | uploaded date                     | [ test query ]                   |
|           | chunk count                       | top match cards                  |
|           | status badge                      |                                  |
+-----------+------------------------------------+----------------------------------+
|           | UPLOAD MODULE                     | INGESTION TIMELINE               |
|           | drag and drop                     | uploaded                         |
|           | replace catalog                   | parsing                          |
|           | validation                        | chunking                         |
|           |                                    | searchable                       |
+-----------+-----------------------------------------------------------------------+
|           | EXPLANATION PANEL                                                   |
|           | How the assistant uses the catalog                                  |
+-----------+-----------------------------------------------------------------------+
```

## Search Preview Result

```text
+-------------------------------------------------------------------+
| Match 01                                      Plumbing             |
| "Leaks under sinks should be logged as urgent if water is active" |
| Source: agency-catalog.pdf                                        |
+-------------------------------------------------------------------+
```

## Mobile Layout

- current catalog card first
- upload module second
- ingestion timeline below it
- search preview becomes full-width beneath upload

## Key States

- no catalog uploaded
- upload in progress
- ingestion failed
- searchable and healthy

## Component Map

- SideRail
- CatalogHealthCard
- UploadDropzone
- UploadProgressCard
- IngestionTimeline
- SearchPreviewWorkbench
- KnowledgeMatchCard
- EmptyStateBlock
