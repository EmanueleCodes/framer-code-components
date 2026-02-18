import { Html } from "@react-three/drei";
import { PiCircleNotch } from "react-icons/pi";
import "./Loading.css";

export default function Loading() {
    return (
        <Html center>
            <PiCircleNotch className="loading" />
        </Html>
    );
}
