"use client";

import { useEffect, useMemo, useState } from "react";
import { seedForms } from "@/data/seed-forms";

const STORAGE_KEY = "geiger-forms:v1";

function readForms() {
  if (typeof window === "undefined") {
    return seedForms;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : seedForms;
  } catch {
    return seedForms;
  }
}

export function useFormStore() {
  const [forms, setForms] = useState(readForms);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
  }, [forms]);

  const stats = useMemo(() => {
    const responses = forms.reduce((sum, form) => sum + form.responses.length, 0);
    const published = forms.filter((form) => form.status === "Published").length;
    const review = forms.reduce(
      (sum, form) => sum + form.responses.filter((response) => response.status === "Needs review").length,
      0,
    );

    return { responses, published, review };
  }, [forms]);

  const updateForm = (formId, patch) => {
    setForms((current) =>
      current.map((form) =>
        form.id === formId
          ? {
              ...form,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : form,
      ),
    );
  };

  const updateQuestions = (formId, questions) => {
    updateForm(formId, { questions });
  };

  const addForm = () => {
    const id = `form-${Date.now()}`;
    const form = {
      id,
      title: "Untitled confidential form",
      description: "Describe what this form collects and who is allowed to submit.",
      status: "Draft",
      owner: "Project owner",
      updatedAt: new Date().toISOString(),
      settings: {
        membersOnly: true,
        verifiedIdentity: true,
        collectEmail: true,
        allowEdits: false,
        notifyOwners: true,
        closeOnDate: false,
        closeDate: "",
        confirmation: "Your response has been submitted.",
      },
      questions: [
        {
          id: `q-${Date.now()}`,
          type: "short",
          title: "Untitled question",
          help: "",
          required: false,
          options: [],
        },
      ],
      responses: [],
    };

    setForms((current) => [form, ...current]);
    return id;
  };

  const submitResponse = (formId, response) => {
    setForms((current) =>
      current.map((form) =>
        form.id === formId
          ? {
              ...form,
              responses: [
                {
                  id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
                  submittedAt: new Date().toISOString(),
                  status: "Needs review",
                  ...response,
                },
                ...form.responses,
              ],
            }
          : form,
      ),
    );
  };

  const updateResponseStatus = (formId, responseId, status) => {
    setForms((current) =>
      current.map((form) =>
        form.id === formId
          ? {
              ...form,
              responses: form.responses.map((response) =>
                response.id === responseId ? { ...response, status } : response,
              ),
            }
          : form,
      ),
    );
  };

  return {
    forms,
    stats,
    addForm,
    updateForm,
    updateQuestions,
    submitResponse,
    updateResponseStatus,
  };
}
