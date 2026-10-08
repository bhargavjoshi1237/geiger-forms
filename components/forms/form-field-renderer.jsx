"use client";

import { interpolate } from "@/lib/forms/logic";
import { translator } from "@/lib/forms/i18n";
import { FieldShell, ariaProps } from "@/components/forms/fields/field-shell";
import { DropdownInput, LongTextInput, TextLikeInput } from "@/components/forms/fields/basic-inputs";
import { ConsentCheckbox, MultiChoice, RankingField, SingleChoice } from "@/components/forms/fields/choice-fields";
import { MatrixField, NpsField, RatingField, ScaleField } from "@/components/forms/fields/survey-fields";
import { AddressField, NameField } from "@/components/forms/fields/contact-fields";
import { BookingField } from "@/components/forms/fields/booking-field";
import { FileField } from "@/components/forms/fields/file-field";
import { SignatureField } from "@/components/forms/fields/signature-field";
import { RepeaterField } from "@/components/forms/fields/repeater-field";
import { CalculatedField, OrderTotal, ProductField } from "@/components/forms/fields/commerce-fields";
import { cn } from "@/lib/utils";

const GROUP_TYPES = new Set(["select", "multiselect", "ranking", "rating", "scale", "nps", "matrix", "name", "address", "booking", "repeater"]);

// Heading / text block: `label` is the heading, `hint` the body (merge tags resolved).
function LayoutBlock({ field, text, large }) {
  if (field.type === "heading") {
    return (
      <div className="pt-2">
        <h2 className={cn("font-semibold tracking-tight text-foreground", large ? "text-2xl sm:text-3xl" : "text-lg")}>{text(field.label || field.title)}</h2>
        {field.hint && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text(field.hint)}</p>}
      </div>
    );
  }
  const body = text(field.hint || field.label || "");
  return (
    <div className={cn("space-y-2 leading-relaxed text-text-secondary", large ? "text-base sm:text-lg" : "text-sm")}>
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}

// Renders one canonical field for respondents and builder previews; without `slug`, upload/booking fields are disabled previews.
export function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  allFields,
  answers,
  form,
  disabled = false,
  slug,
  large = false,
  autoFocus = false,
  onAdvance,
  onEnter,
  onSetAnswer,
  locale,
}) {
  if (!field || field.type === "hidden" || field.type === "page") return null;
  const settings = form?.settings || {};
  const tr = translator(locale || settings.locale);
  const fields = allFields || form?.fieldDefs || [];
  const mergeForm = { fieldDefs: fields };
  const text = (s) => (s && answers ? interpolate(s, mergeForm, answers) : s || "");
  const label = text(field.label || field.title);
  const hint = text(field.hint);
  const currency = settings.payments?.currency || "usd";
  const change = onChange || (() => {});

  if (field.type === "heading" || field.type === "content") return <LayoutBlock field={field} text={text} large={large} />;
  if (field.type === "calculated") return <CalculatedField field={field} label={label} allFields={fields} answers={answers} currency={currency} />;
  if (field.type === "total") {
    return <OrderTotal field={field} label={label} form={form} allFields={fields} answers={answers} onSetAnswer={onSetAnswer} disabled={disabled} tr={tr} />;
  }

  const aria = ariaProps(field, { hint, error });
  const props = { field, value, onChange: change, disabled, aria, large, autoFocus, tr, slug, currency };
  const shell = (children, extra = {}) => (
    <FieldShell
      field={field}
      label={label}
      hint={hint}
      error={error}
      group={GROUP_TYPES.has(field.type)}
      large={large}
      readOnly={field.readOnly}
      readOnlyLabel={tr("readOnly")}
      infoLabel={tr("moreInfo")}
      requiredLabel={tr("required")}
      {...extra}
    >
      {children}
    </FieldShell>
  );

  const choiceHint = () => {
    const v = field.validation || {};
    const min = Number(v.minSelect) || 0;
    const max = Number(v.maxSelect) || 0;
    if (min && max) return tr("chooseBetween", { min, max });
    if (max) return tr("chooseUpTo", { count: max });
    if (min) return tr("chooseAtLeast", { count: min });
    return "";
  };

  switch (field.type) {
    case "textarea":
      return shell(<LongTextInput {...props} />);
    case "select":
      return shell(field.options?.length ? <SingleChoice {...props} onAdvance={onAdvance} /> : <EmptyOptions tr={tr} />);
    case "dropdown":
      return shell(<DropdownInput {...props} placeholder={tr("selectPlaceholder")} />);
    case "multiselect": {
      const note = choiceHint();
      return shell(
        field.options?.length ? (
          <>
            <MultiChoice {...props} />
            {note && <p className="mt-2 text-xs text-text-tertiary">{note}</p>}
          </>
        ) : (
          <EmptyOptions tr={tr} />
        ),
      );
    }
    case "checkbox": {
      const statement = text(field.label && field.label !== field.title ? field.label : field.title);
      const showTitle = field.title && field.label && field.label !== field.title;
      return shell(<ConsentCheckbox {...props} label={statement} />, showTitle ? { label: text(field.title), field: { ...field, required: false } } : { hideLabel: true });
    }
    case "ranking":
      return shell(field.options?.length ? <RankingField {...props} /> : <EmptyOptions tr={tr} />);
    case "rating":
      return shell(<RatingField {...props} />);
    case "scale":
      return shell(<ScaleField {...props} />);
    case "nps":
      return shell(<NpsField {...props} />);
    case "matrix":
      return shell(<MatrixField {...props} />);
    case "name":
      return shell(<NameField {...props} />);
    case "address":
      return shell(<AddressField {...props} />);
    case "booking":
      return shell(<BookingField {...props} />);
    case "file":
      return shell(<FileField {...props} />);
    case "signature":
      return shell(<SignatureField {...props} />);
    case "repeater":
      return shell(<RepeaterField {...props} />);
    case "product":
      return shell(<ProductField {...props} label={label} />, { hideLabel: true });
    default:
      return shell(<TextLikeInput {...props} onEnter={onEnter} />);
  }
}

function EmptyOptions({ tr }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-text-tertiary">{tr("noOptions")}</p>;
}

export default FormFieldRenderer;
