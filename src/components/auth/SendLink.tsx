// SendLink.tsx
import React, { useState } from "react";
import { auth } from "./firebase";
import { sendSignInLinkToEmail, ActionCodeSettings } from "firebase/auth";

const actionCodeSettings: ActionCodeSettings = {
    url: "http://localhost:3000/finishSignIn", // redirect URL after email click
    handleCodeInApp: true,
};

const SendLink: React.FC = () => {
    const [email, setEmail] = useState("");

    const handleSendLink = async () => {
        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem("emailForSignIn", email); // save for later
            alert("Sign-in link sent to your email.");
        } catch (error) {
            console.error("Error sending email link:", error);
        }
    };

    return (
        <div>
            <h2>Email Link Sign-In</h2>
            <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleSendLink}>Send Sign-In Link</button>
        </div>
    );
};

export default SendLink;
