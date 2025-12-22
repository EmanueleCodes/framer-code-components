import React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useFormValue } from "https://framer.com/m/Store-nhJr.js"

interface FieldValidation {
    fieldName: string
}

interface ValidationButtonProps {
    text: string
    requiredFields: FieldValidation[]
    emailFields: FieldValidation[]
    backgroundColor: string
    disabledColor: string
    textColor: string
    style?: React.CSSProperties
    onTap?: () => void
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function ValidationButton(props: ValidationButtonProps) {
    const {
        text,
        requiredFields,
        emailFields,
        backgroundColor,
        disabledColor,
        textColor,
        style,
        onTap,
    } = props

    // Collect all unique field names to read
    const allFieldNames = [
        ...requiredFields.map((f) => f.fieldName),
        ...emailFields.map((f) => f.fieldName),
    ]
    const uniqueFieldNames = [...new Set(allFieldNames)]

    // Read all field values we need to validate
    const fieldValues = uniqueFieldNames.map((fieldName) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [value] = useFormValue(fieldName, "")
        return { name: fieldName, value }
    })

    // Debug logging
    console.log("ValidationButton Debug:", {
        requiredFields,
        emailFields,
        fieldValues,
        uniqueFieldNames,
    })

    // Validate required fields are filled
    const allFieldsFilled =
        requiredFields.length === 0
            ? true
            : requiredFields.every((reqField) => {
                  const field = fieldValues.find(
                      (f) => f.name === reqField.fieldName
                  )
                  const isValid =
                      field && field.value && String(field.value).trim() !== ""
                  console.log(`Field "${reqField.fieldName}" filled:`, isValid)
                  return isValid
              })

    // Validate email fields have correct format
    const emailsValid =
        emailFields.length === 0
            ? true
            : emailFields.every((emailField) => {
                  const field = fieldValues.find(
                      (f) => f.name === emailField.fieldName
                  )
                  if (!field || !field.value) {
                      console.log(`Email "${emailField.fieldName}" empty`)
                      return false
                  }
                  const isValid = isValidEmail(String(field.value))
                  console.log(
                      `Email "${emailField.fieldName}" valid:`,
                      isValid,
                      field.value
                  )
                  return isValid
              })

    const isDisabled = !allFieldsFilled || !emailsValid
    console.log("Button disabled:", isDisabled, {
        allFieldsFilled,
        emailsValid,
    })

    return (
        <button
            onClick={onTap}
            disabled={isDisabled}
            style={{
                ...style,
                padding: "16px 32px",
                fontSize: "16px",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                backgroundColor: isDisabled ? disabledColor : backgroundColor,
                color: textColor,
                transition: "all 0.2s ease",
                opacity: isDisabled ? 0.6 : 1,
            }}
        >
            {text}
        </button>
    )
}

ValidationButton.defaultProps = {
    text: "Submit",
    requiredFields: [{ fieldName: "Name" }, { fieldName: "Email" }],
    emailFields: [{ fieldName: "Email" }],
    backgroundColor: "#6366f1",
    disabledColor: "#cccccc",
    textColor: "#ffffff",
}

addPropertyControls(ValidationButton, {
    text: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Submit",
    },
    requiredFields: {
        type: ControlType.Array,
        title: "Required Fields",
        control: {
            type: ControlType.Object,
            controls: {
                fieldName: {
                    type: ControlType.String,
                    title: "Field Name",
                    placeholder: "e.g., Name, Email",
                },
            },
        },
        defaultValue: [{ fieldName: "Name" }, { fieldName: "Email" }],
    },
    emailFields: {
        type: ControlType.Array,
        title: "Email Fields",
        control: {
            type: ControlType.Object,
            controls: {
                fieldName: {
                    type: ControlType.String,
                    title: "Field Name",
                    placeholder: "e.g., Email",
                },
            },
        },
        defaultValue: [{ fieldName: "Email" }],
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background Color",
        defaultValue: "#6366f1",
    },
    disabledColor: {
        type: ControlType.Color,
        title: "Disabled Color",
        defaultValue: "#cccccc",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#ffffff",
    },
})

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

