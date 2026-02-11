import { ControlType, addPropertyControls, RenderTarget } from "framer"
import { cloneElement, useEffect, useState } from "react"
// import { Drawer } from "vaul";
import { Drawer } from "./Bundle.tsx"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// import { ComponentMessage } from "../../utils/ComponentMessage";

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //
type Width = "default" | "fill"
type Height = "default" | "fill"

interface DrawerFramerProps {
    trigger: React.ReactNode[]
    content: React.ReactNode[]

    triggerConfig: {
        width: Width
        height: Height
    }
    contentConfig: {
        canvasPreview: boolean
        width: Width
        overlayColor: string
        backgroundColor: string
        padding: string
        radius: number
        handle: {
            color: string
            width: number
            height: number
            radius: string
            offsetY: number
        }
    }
}

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(DrawerFramer, {
    trigger: {
        type: ControlType.ComponentInstance,
    },
    triggerConfig: {
        type: ControlType.Object,
        title: " ",
        controls: {
            width: {
                type: ControlType.Enum,
                options: ["default", "fill"],
                optionTitles: ["Default", "Fill"],
                defaultValue: "default",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            height: {
                type: ControlType.Enum,
                options: ["default", "fill"],
                optionTitles: ["Default", "Fill"],
                defaultValue: "default",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
        },
    },
    content: {
        type: ControlType.ComponentInstance,
    },
    contentConfig: {
        type: ControlType.Object,
        title: " ",
        controls: {
            canvasPreview: {
                type: ControlType.Boolean,
                title: "Preview",
                defaultValue: false,
            },
            width: {
                type: ControlType.Enum,
                options: ["default", "fill"],
                optionTitles: ["Default", "Fill"],
                defaultValue: "default",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            overlayColor: {
                type: ControlType.Color,
                title: "Overlay Color",
                defaultValue: "rgba(0, 0, 0, 0.4)",
            },
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "rgb(255,255,255)",
            },
            padding: {
                // @ts-expect-error - Padding is not in this NPM version
                type: ControlType.Padding,
                title: "Padding",
                defaultValue: "16px",
            },
            radius: {
                // @ts-expect-error - BorderRadius is not in this NPM version
                type: ControlType.BorderRadius,
                title: "Radius",
                defaultValue: "16px 16px 0px 0px",
            },
            handle: {
                type: ControlType.Object,
                controls: {
                    color: {
                        type: ControlType.Color,
                        title: "Color",
                        defaultValue: "rgb(100,100,100)",
                    },
                    width: {
                        type: ControlType.Number,
                        title: "Width",
                        defaultValue: 48,
                        unit: "px",
                    },
                    height: {
                        type: ControlType.Number,
                        title: "Height",
                        defaultValue: 6,
                        unit: "px",
                    },
                    radius: {
                        // @ts-expect-error - BorderRadius is not in this NPM version
                        type: ControlType.BorderRadius,
                        defaultValue: "9999px",
                        title: "Radius",
                    },
                    offsetY: {
                        type: ControlType.Number,
                        title: "Offset Y",
                        defaultValue: 0,
                        min: -100,
                        max: 100,
                        unit: "px",
                    },
                },
            },
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
DrawerFramer.defaultProps = {
    triggerConfig: {
        width: "default",
        height: "default",
    },
    contentConfig: {
        width: "default",
        canvasPreview: false,
        overlayColor: "rgba(0, 0, 0, 0.4)",
        backgroundColor: "rgb(255,255,255)",
        padding: "16px",
        radius: "16px 16px 0px 0px",
        handle: {
            color: "rgb(100,100,100)",
            width: 48,
            height: 6,
            radius: "9999px",
            offsetY: 0,
        },
    },
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function DrawerFramer(props: DrawerFramerProps) {
    const isOnFramerCanvas = RenderTarget.hasRestrictions()
    const haveContent = props.content !== undefined && props.content?.length > 0
    const haveTrigger = props.trigger !== undefined && props.trigger?.length > 0

    // ------------------------------------------------------------ //
    // Resolve portal container so that Framer elements keep their
    // scoped CSS (Framer scoping relies on being a descendant of the
    // element that has the `data-framer-root` attribute).
    // ------------------------------------------------------------ //
    const [portalContainer, setPortalContainer] = useState<
        HTMLElement | undefined
    >(undefined)
    useEffect(() => {
        if (typeof window !== "undefined" && !isOnFramerCanvas) {
            setPortalContainer(
                (document.querySelector("[data-framer-root]") as HTMLElement) ||
                    document.getElementById("main") ||
                    undefined
            )
        }
    }, [])

    if (!haveContent || !haveTrigger) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Drawer"
                    subtitle="Set up the component by connecting trigger and content to the component or selecting the trigger and content from the component properties."
                />
            </div>
        )
    }

    // clone the content and set the style hight to 500px
    const content = cloneElement(props.content[0] as React.ReactElement, {
        // @ts-expect-error - This is a Framer component
        style: {
            // @ts-expect-error - This is a Framer component
            ...(props.content[0] as React.ReactElement).props.style,
            // @ts-expect-error - This is a Framer component
            height: props.content[0]?.props.height,
            width:
                props.contentConfig.width === "default"
                    ? // @ts-expect-error - This is a Framer component
                      props.content[0]?.props.width
                    : "100%",
        },
    })

    const trigger = cloneElement(props.trigger[0] as React.ReactElement, {
        // @ts-expect-error - This is a Framer component
        style: {
            // @ts-expect-error - This is a Framer component
            ...(props.trigger[0] as React.ReactElement).props.style,
            width:
                props.triggerConfig.width === "default"
                    ? // @ts-expect-error - This is a Framer component
                      (props.trigger[0] as React.ReactElement).props.width
                    : "100%",
            height:
                props.triggerConfig.height === "default"
                    ? // @ts-expect-error - This is a Framer component
                      (props.trigger[0] as React.ReactElement).props.height
                    : "100%",
        },
    })

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            {/* @ts-expect-error - Custom bundle don't have proper types */}
            <Drawer.Root
                open={
                    isOnFramerCanvas && props.contentConfig.canvasPreview
                        ? true
                        : undefined
                }
                container={portalContainer}
            >
                {/* @ts-expect-error - Custom bundle don't have proper types */}
                <Drawer.Trigger
                    asChild={true}
                    style={{
                        width:
                            props.triggerConfig.width === "default"
                                ? "fit-content"
                                : "100%",
                        height:
                            props.triggerConfig.height === "default"
                                ? // @ts-expect-error - This is a Framer component
                                  (props.trigger[0] as React.ReactElement).props
                                      .height
                                : "100%",
                    }}
                >
                    {trigger}
                </Drawer.Trigger>
                <Drawer.Portal>
                    <Drawer.Overlay
                        // @ts-expect-error - Custom bundle don't have proper types
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 100000,
                            backgroundColor: props.contentConfig.overlayColor,
                        }}
                    />
                    {/* @ts-expect-error - Custom bundle don't have proper types */}
                    <Drawer.Content
                        style={{
                            height: "fit-content",
                            width: "100%",
                            position: "fixed",
                            zIndex: 100000,
                            bottom: 0,
                            left: isOnFramerCanvas ? 300 : 0,
                            right: isOnFramerCanvas ? 300 : 0,
                            outline: "none",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                        asChild={true}
                    >
                        <div
                            style={{
                                padding: props.contentConfig.padding,
                                backgroundColor:
                                    props.contentConfig.backgroundColor,
                                height: "fit-content",
                                width: isOnFramerCanvas ? "60%" : "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: props.contentConfig.radius,
                            }}
                        >
                            <div
                                aria-hidden
                                style={{
                                    margin: "0 auto",
                                    width: props.contentConfig.handle.width,
                                    height: props.contentConfig.handle.height,
                                    flexShrink: 0,
                                    borderRadius:
                                        props.contentConfig.handle.radius,
                                    backgroundColor:
                                        props.contentConfig.handle.color,
                                    transform: `translateY(${props.contentConfig.handle.offsetY}px)`,
                                    zIndex: 99999,
                                }}
                            />
                            {content}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}

DrawerFramer.displayName = "Drawer"
