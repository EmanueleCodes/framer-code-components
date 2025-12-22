import * as React from "react"
import {
    motion,
    useTransform,
    useViewportScroll,
    useAnimation,
} from "framer-motion"
import {
    addPropertyControls,
    ControlType,
    FileControlDescription,
} from "framer"

// Function to extract path from SVG content
const extractPathFromSVG = (svgContent: string): string => {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const path = svgDoc.querySelector("path")
    return path ? path.getAttribute("d") || "" : ""
}

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 320
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

export default function PathReveal(props:any) {
    const {
        svgFile,
        beamColor,
        beamWidth,
        startOpacity,
        endOpacity,
        scrollSpeed,
    } = props
    const { scrollYProgress } = useViewportScroll()
    const pathLength = useTransform(
        scrollYProgress,
        [0, 1],
        [0, 1 * scrollSpeed]
    )
    const controls = useAnimation()

    const [svgPath, setSvgPath] = React.useState<string>("")
    const svgRef = React.useRef<SVGSVGElement>(null)
    const [svgSize, setSvgSize] = React.useState({
        width: "100%",
        height: "100%",
    })

    React.useEffect(() => {
        if (svgFile) {
            fetch(svgFile)
                .then((response) => response.text())
                .then((svgContent) => {
                    const path = extractPathFromSVG(svgContent)
                    setSvgPath(path)
                })
        }
    }, [svgFile])

    React.useEffect(() => {
        if (svgRef.current) {
            const bbox = svgRef.current.getBBox()
            setSvgSize({ width: bbox.width + "px", height: bbox.height + "px" })
        }
    }, [svgPath])

    React.useEffect(() => {
        const unsubscribeY = scrollYProgress.onChange((latest) => {
            if (latest === 1) {
                controls.start({
                    pathLength: 1 * scrollSpeed,
                    transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 10,
                        mass: 0.5,
                    },
                })
            }
        })

        return () => {
            unsubscribeY()
        }
    }, [controls, scrollYProgress, scrollSpeed])

    React.useEffect(() => {
        if (svgRef.current && svgPath) {
            const bbox = svgRef.current.getBBox()
            svgRef.current.setAttribute(
                "viewBox",
                `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
            )
        }
    }, [svgPath])

    return (
        <svg
            ref={svgRef}
            width={svgSize.width}
            height={svgSize.height}
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            overflow="visible"
        >
            <motion.path
                d={svgPath}
                stroke={beamColor}
                strokeWidth={beamWidth}
                strokeOpacity={useTransform(
                    scrollYProgress,
                    [0, 1],
                    [startOpacity, endOpacity]
                )}
                fill="none"
                style={{ pathLength }}
                animate={controls}
            />
        </svg>
    )
}

PathReveal.defaultProps = {
    svgFile: "",
    beamColor: "#fc5025",
    beamWidth: 1,
    startOpacity: 0,
    endOpacity: 1,
    scrollSpeed: 1,
}

addPropertyControls(PathReveal, {
    svgFile: {
        type: ControlType.File,
        title: "SVG File",
        allowedFileTypes: ["svg"],
        description:
            "Upload single node SVG. It will be used as the path for beam to follow",
    } as FileControlDescription,
    beamColor: { type: ControlType.Color, title: "Beam Color" },
    beamWidth: {
        type: ControlType.Number,
        title: "Beam Width",
        min: 0,
        max: 10,
        step: 0.1,
    },
    startOpacity: {
        type: ControlType.Number,
        title: "Start Opacity",
        min: 0,
        max: 1,
        step: 0.1,
    },
    endOpacity: {
        type: ControlType.Number,
        title: "End Opacity",
        min: 0,
        max: 1,
        step: 0.1,
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Scroll Speed",
        min: 0.1,
        max: 10,
        step: 0.1,
    },
})