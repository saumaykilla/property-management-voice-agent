"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppAccess } from "@/components/app-access-provider";
import type { Database } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ServiceCatalogDocumentRow =
  Database["public"]["Tables"]["service_catalog_documents"]["Row"];

type CatalogSummaryResponse =
  {
    latestDocument: ServiceCatalogDocumentRow | null;
    chunkCount: number;
    error?: string;
  };

type CatalogSearchResponse =
  {
    result: {
      matched_chunks: Array<{
        document_id: string;
        chunk_index: number;
        content: string;
        metadata: Record<
          string,
          unknown
        >;
        similarity: number;
      }>;
      suggested_category: string;
      suggested_priority: string;
      confidence: number;
      message_for_agent: string;
    };
    error?: string;
  };

type CatalogProcessResponse =
  {
    result: {
      document_id: string;
      chunk_count: number;
      status: string;
    };
    error?: string;
  };

function sanitizeFilename(
  filename: string,
) {
  const baseName =
    filename
      .replace(
        /\s+/g,
        "-",
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "",
      )
      .toLowerCase();
  return (
    baseName ||
    "service-catalog.pdf"
  );
}

function getCatalogState(
  document: ServiceCatalogDocumentRow | null,
) {
  if (
    !document
  ) {
    return {
      label:
        "Missing",
      className:
        "status-alert",
      timelineStep: 0,
      message:
        "No catalog has been uploaded for this agency yet.",
    };
  }

  if (
    document.ingestion_status ===
    "ready"
  ) {
    return {
      label:
        "Searchable",
      className:
        "status-live",
      timelineStep: 4,
      message:
        "The assistant can retrieve guidance from this catalog during calls.",
    };
  }

  if (
    document.ingestion_status ===
    "processing"
  ) {
    return {
      label:
        "Processing",
      className:
        "status-caution",
      timelineStep: 2,
      message:
        "The knowledge base is being parsed, chunked, and prepared for search.",
    };
  }

  if (
    document.ingestion_status ===
    "failed"
  ) {
    return {
      label:
        "Needs attention",
      className:
        "status-alert",
      timelineStep: 1,
      message:
        document.ingestion_error ??
        "Catalog preparation failed and needs another pass.",
    };
  }

  return {
    label:
      "Queued",
    className:
      "status-caution",
    timelineStep: 1,
    message:
      "The catalog is stored and waiting to be prepared for search.",
  };
}

export default function CatalogPage() {
  const supabase =
    useMemo(
      () =>
        createBrowserSupabaseClient(),
      [],
    );
  const {
    access,
    session,
  } =
    useAppAccess();
  const [
    documents,
    setDocuments,
  ] =
    useState<
      ServiceCatalogDocumentRow[]
    >(
      [],
    );
  const [
    latestDocument,
    setLatestDocument,
  ] =
    useState<ServiceCatalogDocumentRow | null>(
      null,
    );
  const [
    chunkCount,
    setChunkCount,
  ] =
    useState(
      0,
    );
  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );
  const [
    searchResult,
    setSearchResult,
  ] =
    useState<
      | CatalogSearchResponse["result"]
      | null
    >(
      null,
    );
  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );
  const [
    isUploading,
    setIsUploading,
  ] =
    useState(
      false,
    );
  const [
    isSearching,
    setIsSearching,
  ] =
    useState(
      false,
    );
  const [
    feedback,
    setFeedback,
  ] =
    useState<
      | string
      | null
    >(
      null,
    );

  const agencyId =
    access?.agencyId ??
    null;
  const catalogState =
    getCatalogState(
      latestDocument,
    );

  const callInternalApi =
    useCallback(
      async <
        TResponse,
      >(
        path: string,
        init?: RequestInit,
      ): Promise<TResponse> => {
        const accessToken =
          session?.access_token;

        if (
          !accessToken
        ) {
          throw new Error(
            "We couldn't verify your session. Sign in again and retry.",
          );
        }

        const response =
          await fetch(
            path,
            {
              ...init,
              headers:
                {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${accessToken}`,
                  ...(init?.headers ??
                    {}),
                },
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () =>
                null,
            )) as
            | (TResponse & {
                error?: string;
              })
            | null;

        if (
          !response.ok
        ) {
          throw new Error(
            payload?.error ??
              "The request could not be completed.",
          );
        }

        return payload as TResponse;
      },
      [
        session?.access_token,
      ],
    );

  const loadCatalog =
    useCallback(async () => {
      if (
        !supabase ||
        !agencyId ||
        !session?.access_token
      ) {
        setDocuments(
          [],
        );
        setLatestDocument(
          null,
        );
        setChunkCount(
          0,
        );
        setIsLoading(
          false,
        );
        return;
      }

      setIsLoading(
        true,
      );

      const [
        {
          data: documentsData,
          error:
            documentsError,
        },
        summary,
      ] =
        await Promise.all(
          [
            supabase
              .from(
                "service_catalog_documents",
              )
              .select(
                "*",
              )
              .eq(
                "agency_id",
                agencyId,
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              ),
            callInternalApi<CatalogSummaryResponse>(
              "/api/catalog/summary",
              {
                method:
                  "GET",
              },
            ).catch(
              (
                error,
              ) => ({
                latestDocument:
                  null,
                chunkCount: 0,
                error:
                  error instanceof
                  Error
                    ? error.message
                    : "Unable to load catalog summary.",
              }),
            ),
          ],
        );

      if (
        documentsError
      ) {
        setFeedback(
          "We couldn't load the catalog history right now.",
        );
        setIsLoading(
          false,
        );
        return;
      }

      setDocuments(
        documentsData ??
          [],
      );
      setLatestDocument(
        summary.latestDocument,
      );
      setChunkCount(
        summary.chunkCount ??
          0,
      );
      if (
        summary.error
      ) {
        setFeedback(
          summary.error,
        );
      }
      setIsLoading(
        false,
      );
    }, [
      agencyId,
      callInternalApi,
      session?.access_token,
      supabase,
    ]);

  useEffect(() => {
    void loadCatalog();
  }, [
    loadCatalog,
  ]);

  async function handleUpload() {
    if (
      !supabase ||
      !agencyId ||
      !selectedFile
    ) {
      return;
    }

    if (
      selectedFile.type &&
      selectedFile.type !==
        "application/pdf"
    ) {
      setFeedback(
        "Upload a PDF so the assistant receives clean catalog input.",
      );
      return;
    }

    setIsUploading(
      true,
    );
    setFeedback(
      null,
    );

    const documentId =
      crypto.randomUUID();
    const safeName =
      sanitizeFilename(
        selectedFile.name,
      );
    const storagePath = `${agencyId}/${documentId}/${safeName}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "service-catalogs",
        )
        .upload(
          storagePath,
          selectedFile,
          {
            upsert: false,
            contentType:
              selectedFile.type ||
              "application/pdf",
          },
        );

    if (
      uploadError
    ) {
      setFeedback(
        "We couldn't store the catalog file right now. Try again in a moment.",
      );
      setIsUploading(
        false,
      );
      return;
    }

    const {
      error:
        documentError,
    } =
      await supabase
        .from(
          "service_catalog_documents",
        )
        .insert(
          {
            id: documentId,
            agency_id:
              agencyId,
            storage_bucket:
              "service-catalogs",
            storage_path:
              storagePath,
            original_filename:
              selectedFile.name,
            mime_type:
              selectedFile.type ||
              "application/pdf",
            byte_size:
              selectedFile.size,
            file_hash:
              null,
            ingestion_status:
              "pending",
          },
        );

    if (
      documentError
    ) {
      setFeedback(
        "The file uploaded, but we couldn't register it for catalog preparation.",
      );
      setIsUploading(
        false,
      );
      return;
    }

    try {
      const payload =
        await callInternalApi<CatalogProcessResponse>(
          "/api/catalog/process",
          {
            method:
              "POST",
            body: JSON.stringify(
              {
                documentId,
              },
            ),
          },
        );

      setSelectedFile(
        null,
      );
      await loadCatalog();
      setFeedback(
        `Catalog prepared successfully with ${payload.result.chunk_count} searchable sections.`,
      );
    } catch (error) {
      await loadCatalog();
      setFeedback(
        error instanceof
          Error
          ? error.message
          : "Catalog preparation failed.",
      );
    } finally {
      setIsUploading(
        false,
      );
    }
  }

  const timeline =
    [
      {
        label:
          "Uploaded",
        active:
          catalogState.timelineStep >=
          1,
      },
      {
        label:
          "Parsing",
        active:
          catalogState.timelineStep >=
          2,
      },
      {
        label:
          "Chunking",
        active:
          catalogState.timelineStep >=
          3,
      },
      {
        label:
          "Embedded",
        active:
          catalogState.timelineStep >=
          4,
      },
      {
        label:
          "Searchable",
        active:
          catalogState.timelineStep >=
          4,
      },
    ];

  return (
    <div className="page-grid catalog-page">
      <div className="app-header">
        <div className="page-heading">
          <h1>
            Service
            catalog
          </h1>
          <p>
            Manage
            the
            agency-wide
            knowledge
            base
            and
            confirm
            the
            assistant
            can
            actually
            search
            it
            during
            calls.
          </p>
        </div>
        <span
          className={`status-pill ${catalogState.className}`}
        >
          {
            catalogState.label
          }
        </span>
      </div>

      {feedback ? (
        <p
          className={
            feedback.includes(
              "failed",
            ) ||
            feedback.includes(
              "couldn't",
            )
              ? "feedback-error"
              : "feedback-success"
          }
        >
          {
            feedback
          }
        </p>
      ) : null}

      <div className="catalog-workspace-grid">
        <section className="surface-card catalog-health-panel">
          <strong>
            Current
            catalog
            card
          </strong>
          {isLoading ? (
            <p className="muted-text">
              Loading
              catalog
              health...
            </p>
          ) : !latestDocument ? (
            <div className="dashboard-empty-state">
              <strong>
                No
                catalog
                uploaded
                yet
              </strong>
              <p className="muted-text">
                The
                assistant
                uses
                one
                agency-wide
                PDF
                for
                approved
                vendors,
                policies,
                and
                service
                guidance.
              </p>
            </div>
          ) : (
            <div className="catalog-health-list">
              <div className="review-item">
                <span className="console-label">
                  File
                </span>
                <strong>
                  {
                    latestDocument.original_filename
                  }
                </strong>
              </div>
              <div className="review-item">
                <span className="console-label">
                  Uploaded
                </span>
                <strong>
                  {new Date(
                    latestDocument.created_at,
                  ).toLocaleString()}
                </strong>
              </div>
              <div className="review-item">
                <span className="console-label">
                  Chunk
                  count
                </span>
                <strong>
                  {
                    chunkCount
                  }
                </strong>
              </div>
              <div className="review-item">
                <span className="console-label">
                  Last
                  processed
                </span>
                <strong>
                  {latestDocument.ingested_at
                    ? new Date(
                        latestDocument.ingested_at,
                      ).toLocaleString()
                    : "Still preparing"}
                </strong>
              </div>
            </div>
          )}
        </section>
        <section className="surface-card catalog-timeline-panel">
          <strong>
            Ingestion
            timeline
          </strong>
          <div className="catalog-timeline-list">
            {timeline.map(
              (
                step,
              ) => (
                <div
                  key={
                    step.label
                  }
                  className={`catalog-timeline-step${step.active ? " active" : ""}`}
                >
                  <span
                    className={`preview-dot${step.active ? "" : " muted"}`}
                  />
                  <div>
                    <strong>
                      {
                        step.label
                      }
                    </strong>
                    <p>
                      {step.active
                        ? "Completed or currently active."
                        : "Waiting for the previous stage."}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      <div className="catalog-workspace-grid lower">
        <section className="surface-card catalog-upload-panel">
          <strong>
            Upload
            module
          </strong>
          <p className="muted-text">
            Replace
            the
            current
            PDF
            whenever
            service
            policies
            or
            approved
            vendors
            change.
          </p>
          <input
            accept="application/pdf,.pdf"
            onChange={(
              event,
            ) =>
              setSelectedFile(
                event
                  .target
                  .files?.[0] ??
                  null,
              )
            }
            type="file"
          />
          {selectedFile ? (
            <div className="preview-ticket">
              <strong>
                {
                  selectedFile.name
                }
              </strong>
              <span>
                {Math.round(
                  selectedFile.size /
                    1024,
                )}{" "}
                KB
                ready
                for
                storage
                and
                processing
              </span>
            </div>
          ) : null}
          <div className="units-inline-bar">
            <button
              className="button-primary"
              disabled={
                !selectedFile ||
                isUploading
              }
              onClick={() =>
                void handleUpload()
              }
              type="button"
            >
              {isUploading
                ? "Uploading and processing..."
                : "Upload first catalog"}
            </button>
          </div>
        </section>

      
      </div>

      <section className="surface-card catalog-explainer-card">
        <strong>
          How
          the
          assistant
          uses
          this
          catalog
        </strong>
        <p className="muted-text">
          This
          page
          is
          intentionally
          a
          knowledge
          console,
          not
          a
          file
          manager.
          The
          uploaded
          PDF
          is
          parsed
          into
          chunks,
          embedded,
          and
          searched
          only
          within
          the
          current
          agency
          so
          the
          assistant
          can
          answer
          routine
          maintenance
          questions
          with
          grounded
          guidance.
        </p>
        <div className="units-preview-list">
          {documents.length ===
          0 ? (
            <p className="muted-text">
              No
              catalog
              history
              has
              been
              recorded
              yet.
            </p>
          ) : (
            documents.map(
              (
                document,
              ) => {
                const state =
                  getCatalogState(
                    document,
                  );
                return (
                  <div
                    key={
                      document.id
                    }
                    className="preview-ticket"
                  >
                    <strong>
                      {
                        document.original_filename
                      }
                    </strong>
                    <span>
                      {new Date(
                        document.created_at,
                      ).toLocaleString()}
                    </span>
                    <em>
                      {
                        state.label
                      }
                    </em>
                  </div>
                );
              },
            )
          )}
        </div>
      </section>
    </div>
  );
}
