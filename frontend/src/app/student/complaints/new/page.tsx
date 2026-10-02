"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useRef, useState } from "react";

type ComplaintCategory =
  | ""
  | "Maintenance"
  | "Ethernet"
  | "Electrical"
  | "Civil"
  | "Cleanliness";

interface SelectedFile {
  id: string;
  file: File;
}

const categories: Exclude<ComplaintCategory, "">[] = [
  "Maintenance",
  "Ethernet",
  "Electrical",
  "Civil",
  "Cleanliness",
];

const MAX_DESCRIPTION_WORDS = 200;

function countWords(text: string): number {
  const trimmed = text.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function getFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 13h7M8.5 16h5" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M19 12H5" strokeLinecap="round" />
      <path
        d="m12 19-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function ComplaintIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
      />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

export default function RaiseComplaintPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ComplaintCategory>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const [categoryError, setCategoryError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wordCount = countWords(description);

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setCategory(event.target.value as ComplaintCategory);
    setCategoryError("");
    setFormMessage("");
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
    setTitleError("");
    setFormMessage("");
  }

  function handleDescriptionChange(
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    const value = event.target.value;
    const words = value.trim() ? value.trim().split(/\s+/) : [];

    if (words.length > MAX_DESCRIPTION_WORDS) {
      setDescription(words.slice(0, MAX_DESCRIPTION_WORDS).join(" "));
      setDescriptionError(
        `Description cannot exceed ${MAX_DESCRIPTION_WORDS} words.`,
      );
    } else {
      setDescription(value);
      setDescriptionError("");
    }

    setFormMessage("");
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const validFiles: SelectedFile[] = [];

    for (const file of files) {
      const isSupported =
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.type === "application/msword" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (!isSupported) {
        setFormMessage(
          "Only image, PDF, DOC or DOCX files can be attached.",
        );
        continue;
      }

      const alreadySelected = selectedFiles.some(
        (selectedFile) =>
          selectedFile.file.name === file.name &&
          selectedFile.file.size === file.size,
      );

      if (!alreadySelected) {
        validFiles.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
        });
      }
    }

    if (validFiles.length) {
      setSelectedFiles((current) => [...current, ...validFiles]);
      setFormMessage("");
    }

    event.target.value = "";
  }

  function removeFile(fileId: string) {
    setSelectedFiles((current) =>
      current.filter((selectedFile) => selectedFile.id !== fileId),
    );
  }

  function validateForm() {
    let isValid = true;

    if (!category) {
      setCategoryError("Please select a complaint category.");
      isValid = false;
    } else {
      setCategoryError("");
    }

    if (!title.trim()) {
      setTitleError("Please enter a complaint title.");
      isValid = false;
    } else if (title.trim().length < 5) {
      setTitleError("Complaint title should be at least 5 characters.");
      isValid = false;
    } else {
      setTitleError("");
    }

    if (wordCount > MAX_DESCRIPTION_WORDS) {
      setDescriptionError(
        `Description cannot exceed ${MAX_DESCRIPTION_WORDS} words.`,
      );
      isValid = false;
    } else {
      setDescriptionError("");
    }

    return isValid;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    setIsSubmitting(false);
    setFormMessage(
      "Your complaint form is ready. Submission will be connected when the backend is integrated.",
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-[76px] items-center border-b border-slate-100 px-6">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-3"
              aria-label="Go to student dashboard"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src="/images/gbu-logo.png"
                  alt="Gautam Buddha University"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="leading-tight">
                <p className="text-[13px] font-bold text-slate-900">
                  GBU Portal
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  Student Services
                </p>
              </div>
            </Link>
          </div>

          <nav
            className="flex-1 px-3 py-5"
            aria-label="Student navigation"
          >
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Main Menu
            </p>

            <div className="space-y-1">
              <Link
                href="/student/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <DashboardIcon />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/student/complaints"
                className="flex items-center gap-3 rounded-lg bg-[#f8e9ef] px-3 py-2.5 text-sm font-semibold text-[#a5174d]"
              >
                <ComplaintIcon />
                <span>My Complaints</span>
              </Link>
            </div>
          </nav>

          <div className="border-t border-slate-100 px-5 py-4">
            <p className="text-[11px] leading-5 text-slate-400">
              Gautam Buddha University
              <br />
              Student Services Portal
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Link
                href="/student/dashboard"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                aria-label="Go to student dashboard"
              >
                <img
                  src="/images/gbu-logo.png"
                  alt=""
                  className="h-full w-full object-contain"
                />
              </Link>

              <div className="leading-tight">
                <p className="text-sm font-bold text-slate-900">
                  GBU Portal
                </p>
                <p className="text-[10px] text-slate-400">
                  Student Services
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-slate-800">
                Raise Complaint
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Submit a new campus or hostel concern
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  Ayush Kumar
                </p>
                <p className="text-xs text-slate-400">Student</p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e9ef] text-sm font-bold text-[#a5174d]">
                AK
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1040px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <Link
                    href="/student/dashboard"
                    className="transition-colors hover:text-[#a5174d]"
                  >
                    Dashboard
                  </Link>

                  <span>/</span>

                  <Link
                    href="/student/complaints"
                    className="transition-colors hover:text-[#a5174d]"
                  >
                    My Complaints
                  </Link>

                  <span>/</span>

                  <span className="text-slate-600">
                    Raise Complaint
                  </span>
                </div>

                <h1 className="text-[25px] font-bold tracking-tight text-slate-900 sm:text-[28px]">
                  Raise a Complaint
                </h1>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                  Submit your complaint with the relevant details so it can
                  be reviewed and resolved by the concerned authority.
                </p>
              </div>

              <Link
                href="/student/complaints"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <ArrowLeftIcon />
                <span>Back to Complaints</span>
              </Link>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8e9ef] text-[#a5174d]">
                      <ComplaintIcon />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Complaint Details
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Fields marked with{" "}
                        <span className="font-semibold text-[#a5174d]">
                          *
                        </span>{" "}
                        are required.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
                  <div>
                    <label
                      htmlFor="complaint-category"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Complaint Category{" "}
                      <span className="text-[#a5174d]">*</span>
                    </label>

                    <div className="relative">
                      <select
                        id="complaint-category"
                        value={category}
                        onChange={handleCategoryChange}
                        aria-invalid={Boolean(categoryError)}
                        aria-describedby={
                          categoryError
                            ? "complaint-category-error"
                            : undefined
                        }
                        className={`h-11 w-full appearance-none rounded-lg border bg-white px-3.5 pr-10 text-sm text-slate-800 outline-none transition-all ${
                          categoryError
                            ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                            : "border-slate-200 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10"
                        }`}
                      >
                        <option value="">
                          Select complaint category
                        </option>

                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <ChevronDownIcon />
                    </div>

                    {categoryError && (
                      <p
                        id="complaint-category-error"
                        className="mt-1.5 text-xs font-medium text-red-600"
                      >
                        {categoryError}
                      </p>
                    )}

                    <p className="mt-1.5 text-xs text-slate-400">
                      Select the category that best describes your
                      complaint.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="complaint-title"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Complaint Title{" "}
                      <span className="text-[#a5174d]">*</span>
                    </label>

                    <input
                      id="complaint-title"
                      type="text"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Briefly describe the issue"
                      aria-invalid={Boolean(titleError)}
                      aria-describedby={
                        titleError
                          ? "complaint-title-error"
                          : undefined
                      }
                      className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all ${
                        titleError
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10"
                      }`}
                    />

                    {titleError && (
                      <p
                        id="complaint-title-error"
                        className="mt-1.5 text-xs font-medium text-red-600"
                      >
                        {titleError}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="complaint-description"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Description{" "}
                        <span className="font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <span
                        className={`text-xs font-medium ${
                          wordCount >= MAX_DESCRIPTION_WORDS
                            ? "text-[#a5174d]"
                            : "text-slate-400"
                        }`}
                      >
                        {wordCount} / {MAX_DESCRIPTION_WORDS} words
                      </span>
                    </div>

                    <textarea
                      id="complaint-description"
                      value={description}
                      onChange={handleDescriptionChange}
                      rows={6}
                      placeholder="Add any additional details that may help the concerned authority understand and resolve the issue..."
                      aria-invalid={Boolean(descriptionError)}
                      aria-describedby={
                        descriptionError
                          ? "complaint-description-error"
                          : undefined
                      }
                      className={`w-full resize-y rounded-lg border bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 outline-none transition-all ${
                        descriptionError
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10"
                      }`}
                    />

                    <div className="mt-1.5 flex items-start justify-between gap-3">
                      <p className="text-xs leading-5 text-slate-400">
                        You can provide additional information, location
                        details or anything else relevant to the complaint.
                      </p>

                      {descriptionError && (
                        <p
                          id="complaint-description-error"
                          className="shrink-0 text-xs font-medium text-red-600"
                        >
                          {descriptionError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2">
                      <label
                        htmlFor="complaint-attachments"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Attachment{" "}
                        <span className="font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <p className="mt-1 text-xs text-slate-400">
                        Attach an image or document if it helps explain
                        the complaint.
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      id="complaint-attachments"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFiles}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-7 text-center transition-colors hover:border-[#a5174d]/50 hover:bg-[#fdf7f9]"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#a5174d] shadow-sm">
                        <UploadIcon />
                      </span>

                      <span className="mt-3 text-sm font-semibold text-slate-700">
                        Click to upload files
                      </span>

                      <span className="mt-1 text-xs text-slate-400">
                        Images, PDF, DOC or DOCX
                      </span>
                    </button>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map(({ id, file }) => (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <FileIcon />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-700">
                                  {file.name}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {getFileSize(file.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFile(id)}
                              aria-label={`Remove ${file.name}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#ead3dc] bg-[#fdf7f9] px-4 py-3.5">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a5174d] text-[10px] font-bold text-white">
                        i
                      </div>

                      <p className="text-xs leading-5 text-slate-600">
                        Your student and hostel details are already
                        associated with your university account. You do not
                        need to enter them again while submitting this
                        complaint.
                      </p>
                    </div>
                  </div>

                  {formMessage && (
                    <div
                      role="status"
                      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
                    >
                      {formMessage}
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                  <Link
                    href="/student/complaints"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#a5174d] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#8e123f] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Preparing..." : "Submit Complaint"}
                  </button>
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}