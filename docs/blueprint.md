# **App Name**: AgroAssist

## Core Features:

- Image Upload & Storage: Allow farmers to upload crop images via camera or gallery, compress them, and store them in Firebase Storage with references in Firestore, including metadata like user ID, crop type, timestamp, and optional location.
- AI Disease Detection: Integrate an AI model to process uploaded images and identify plant diseases, providing the disease name, confidence score, severity level, and storing results in Firestore.
- Treatment Recommendation Engine: Based on the detected disease, fetch treatment recommendations (pesticide, organic solution, application method, dosage, prevention tips) from a Firestore database.
- Nearby Supplier Finder: Use geolocation to display a list of verified suppliers within a 50km radius, including their shop name, available medicine, price, contact number, and a WhatsApp button, integrated with Google Maps API.
- Crop Health History Dashboard: Display a farmer's past diagnoses, disease frequency chart, severity trend, and treatments applied, with the ability to download PDF reports.
- AI-Powered Confidence Explanation: Provide an explanation of the AI's confidence level for each disease diagnosis, helping farmers understand the reasoning behind the tool's assessment and treatment recommendations, structured as a 'Why We Think' section with spotted leaf patterns, lesion clustering, texture comparison, and confidence level. This enhances trust in the tool.
- User Authentication and Role-Based Access Control: Implement Firebase Authentication for user registration and login (phone number preferred). Set up role-based access control to restrict data access based on user roles (farmer, supplier, admin).
- Early Outbreak Alert System: If many farmers in the same region report the same disease, trigger an alert to notify nearby farmers and show a 'Disease spreading in your area' banner. This feature focuses on preventive, community-powered, and scalable public health relevance.
- Offline Safety Mode: Store the image locally and upload when the network returns, showing a 'Pending Diagnosis' message to acknowledge rural internet instability.

## Style Guidelines:

- Primary color: Deep green (#2E7D32) to symbolize growth, health, and nature, evoking trust.
- Background color: Off-white (#F1F8E9), a very light tint of green, creating a soft, clean backdrop that ensures readability and reduces eye strain, similar to paper.
- Accent color: Earth brown (#6D4C41), an analogous hue to green. Using a color reminiscent of soil, adds an organic, reliable, grounded feel that suggests stability and natural remedies.
- Body and headline font: 'PT Sans' sans-serif font for clear headings and readable body text.
- Use simple, intuitive icons with visual cues to aid understanding, especially important for multi-language support and low-literacy users.
- Maintain a clean, minimal, rural-friendly design with large buttons, easy navigation, and a mobile-first approach, optimizing for low-bandwidth environments.
- Use green gradients subtly in the hero section for a modern look.