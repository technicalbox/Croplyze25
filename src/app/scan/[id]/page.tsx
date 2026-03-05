'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Sprout, TestTube2, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { generateTreatmentAdvice, GenerateTreatmentAdviceOutput } from "@/ai/flows/generate-treatment-advice-flow";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, updateDoc } from 'firebase/firestore';
import { Diagnosis } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { haptics } from "@/lib/haptics";
import { useTranslate } from "@/hooks/use-translate";
import { useTTS } from "@/hooks/useTTS";
import { T } from "@/components/common/translate";

const severityMap = {
    High: {
        variant: "destructive",
        icon: <AlertCircle className="h-4 w-4 mr-2" />,
        text: "High Severity",
    },
    Medium: {
        variant: "accent",
        icon: <AlertCircle className="h-4 w-4 mr-2" />,
        text: "Medium Severity",
    },
    Low: {
        variant: "secondary",
        icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
        text: "Low Severity",
    },
    'Not Applicable': {
        variant: 'default',
        icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
        text: 'Healthy'
    }
} as const;


export default function ScanResultPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user, loading: userLoading } = useUser();

    const [reportData, setReportData] = useState<Diagnosis | null>(null);
    const [treatmentAdvice, setTreatmentAdvice] = useState<GenerateTreatmentAdviceOutput | null>(null);
    const [isTreatmentLoading, setIsTreatmentLoading] = useState(false);

    const docPath = user ? `users/${user.uid}/cropDiagnoses` : undefined;
    const { data: firestoreData, loading: firestoreLoading } = useDoc<Diagnosis>(docPath, id);
    const firestore = useFirestore();

    // Effect 1: Load initial data from session storage or Firestore
    useEffect(() => {
        if (!reportData) {
            const storedData = sessionStorage.getItem(id);
            if (storedData) {
                setReportData(JSON.parse(storedData));
            } else if (firestoreData) {
                setReportData(firestoreData);
            }
        }
    }, [id, firestoreData, reportData]);


    // Effect 2: Generate treatment advice if needed
    useEffect(() => {
        let isMounted = true;
        if (reportData && !reportData.treatment) {
            const { diagnosis, cropType } = reportData;
            if (diagnosis.diseaseName && diagnosis.diseaseName !== 'No disease detected' && diagnosis.diseaseName !== 'Healthy') {
                setIsTreatmentLoading(true);
                generateTreatmentAdvice({
                    diseaseName: diagnosis.diseaseName,
                    cropType: cropType,
                    severityLevel: diagnosis.severityLevel,
                }).then(advice => {
                    if (isMounted) {
                        setTreatmentAdvice(advice);
                        const updatedReportData = { ...reportData, treatment: advice };
                        setReportData(updatedReportData as Diagnosis);
                        sessionStorage.setItem(id, JSON.stringify(updatedReportData));

                        if (user) {
                            const docRef = doc(firestore, `users/${user.uid}/cropDiagnoses`, id);
                            updateDoc(docRef, { treatment: advice });
                        }
                    }
                }).catch(err => {
                    console.error("Failed to get treatment advice:", err);
                }).finally(() => {
                    if (isMounted) setIsTreatmentLoading(false);
                });
            }
        } else if (reportData?.treatment) {
            setTreatmentAdvice(reportData.treatment);
        }

        return () => { isMounted = false; }
    }, [reportData, id, user, firestore]);

    // Unconditional hook calls — must be before any early returns!
    const safeDiagnosis = reportData?.diagnosis;
    const rawDiseaseName = safeDiagnosis?.diseaseName ?? '';
    const rawDescription = safeDiagnosis?.description ?? '';
    const rawWhyWeThink = safeDiagnosis?.whyWeThink ?? '';
    const isHealthyState = !rawDiseaseName || rawDiseaseName === 'No disease detected' || rawDiseaseName === 'Healthy';

    // Dynamic translation via Lingva — returns original text instantly, swaps async
    const translatedDiseaseName = useTranslate(isHealthyState ? '' : rawDiseaseName);
    const translatedDescription = useTranslate(isHealthyState ? '' : rawDescription);
    const translatedWhyWeThink = useTranslate(isHealthyState ? '' : rawWhyWeThink);

    // Translate treatment & prevention content
    const translatedOrganicName = useTranslate(reportData?.treatment?.organicSolutionRecommendation?.name ?? '');
    const translatedOrganicPrep = useTranslate(reportData?.treatment?.organicSolutionRecommendation?.preparation ?? '');
    const translatedOrganicMethod = useTranslate(reportData?.treatment?.organicSolutionRecommendation?.applicationMethod ?? '');
    const translatedPesticideName = useTranslate(reportData?.treatment?.pesticideRecommendation?.name ?? '');
    const translatedPesticideDosage = useTranslate(reportData?.treatment?.pesticideRecommendation?.dosage ?? '');
    const translatedPesticideMethod = useTranslate(reportData?.treatment?.pesticideRecommendation?.applicationMethod ?? '');

    const isLoading = (userLoading || firestoreLoading) && !reportData;

    // ── TTS (multi-language) ─────────────────────────────────────────
    const { speaking, loading: ttsLoading, toggle: toggleTTS, stop: stopTTS } = useTTS();

    // Cleanup TTS on unmount
    useEffect(() => { return () => stopTTS(); }, [stopTTS]);

    function buildDiagnosisSpeechText(): string {
        if (!reportData) return '';
        const d = reportData.diagnosis;
        const t = treatmentAdvice;
        const parts: string[] = [];

        if (isHealthyState) {
            parts.push(`Your ${reportData.cropType} appears to be healthy.`);
            parts.push('Continue with your current care routine and monitor regularly.');
        } else {
            parts.push(`Diagnosis report for ${reportData.cropType}.`);
            parts.push(`Disease detected: ${translatedDiseaseName || d.diseaseName}.`);
            parts.push(`Severity: ${d.severityLevel}.`);
            parts.push(`Confidence: ${Math.round(d.confidenceScore * 100)} percent.`);
            if (translatedDescription || d.description) {
                parts.push(translatedDescription || d.description);
            }
            if (translatedWhyWeThink || d.whyWeThink) {
                parts.push(`Why we think this: ${translatedWhyWeThink || d.whyWeThink}`);
            }
            if (t?.organicSolutionRecommendation) {
                parts.push(`Organic treatment: ${t.organicSolutionRecommendation.name}. ${t.organicSolutionRecommendation.preparation}. ${t.organicSolutionRecommendation.applicationMethod}`);
            }
            if (t?.pesticideRecommendation) {
                parts.push(`Pesticide treatment: ${t.pesticideRecommendation.name}. Dosage: ${t.pesticideRecommendation.dosage}. ${t.pesticideRecommendation.applicationMethod}`);
            }
            if (t?.preventionTips?.length) {
                parts.push(`Prevention tips: ${t.preventionTips.join('. ')}`);
            }
        }
        return parts.join(' ');
    }

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-5xl py-8 px-4 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
                <h1 className="text-3xl font-bold">Loading Diagnosis...</h1>
                <p className="text-muted-foreground mt-2">Please wait while we retrieve the scan details.</p>
            </div>
        )
    }

    if (!reportData) {
        return (
            <div className="container mx-auto max-w-5xl py-8 px-4 text-center">
                <h1 className="text-2xl font-bold">Diagnosis Not Found</h1>
                <p className="text-muted-foreground">The requested scan could not be found.</p>
            </div>
        );
    }

    const { diagnosis, image, cropType } = reportData;
    const isHealthy = !diagnosis.diseaseName || diagnosis.diseaseName === 'No disease detected' || diagnosis.diseaseName === 'Healthy';
    const confidencePercent = Math.round(diagnosis.confidenceScore * 100);
    const severity = diagnosis.severityLevel as keyof typeof severityMap;

    return (
        <div className="bg-background flex-1">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold truncate"><T text="Diagnosis Report" /></h1>
                <Button
                    variant={speaking ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => { haptics.light(); toggleTTS(buildDiagnosisSpeechText()); }}
                    className="shrink-0"
                    disabled={ttsLoading}
                >
                    {ttsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : speaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg"><T text="Scanned Image" /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Image src={image} alt="Uploaded crop" width={400} height={300} className="rounded-lg w-full aspect-video object-cover" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-xl"><T text="AI Diagnosis" /></CardTitle>
                        <CardDescription>{cropType}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h3 className="text-2xl font-bold text-primary font-headline">{isHealthy ? <T text="Healthy" /> : (translatedDiseaseName || diagnosis.diseaseName)}</h3>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground"><T text="Confidence" /></p>
                            <div className="flex items-center gap-2">
                                <Progress value={confidencePercent} className="w-full" />
                                <span className="text-sm font-bold">{confidencePercent}%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground"><T text="Severity" /></p>
                            <Badge variant={isHealthy ? 'default' : severityMap[severity].variant} className="flex items-center w-fit">
                                {isHealthy ? <CheckCircle2 className="h-4 w-4 mr-2" /> : severityMap[severity].icon}
                                {isHealthy ? <T text="Healthy" /> : <T text={severityMap[severity].text} />}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{isHealthy ? <T text="Your crop appears to be healthy." /> : (translatedDescription || diagnosis.description)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-xl"><T text="Why We Think This" /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1">
                                <AccordionTrigger><T text="Visual Evidence Analysis" /></AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    {isHealthy ? <T text="The leaves and stem show no signs of common diseases, discoloration, or stress. The overall structure is robust and vibrant." /> : (translatedWhyWeThink || diagnosis.whyWeThink)}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-xl"><T text="Management Plan" /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isHealthy ? (
                            <div className="p-4 border rounded-md bg-secondary/50 text-center">
                                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                                <h4 className="font-semibold"><T text="Keep up the good work!" /></h4>
                                <p className="text-sm text-muted-foreground"><T text="Continue with your current care routine and monitor regularly." /></p>
                            </div>
                        ) : isTreatmentLoading ? (
                            <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="mt-4 text-muted-foreground"><T text="Generating treatment plan..." /></p>
                            </div>
                        ) : (
                            <Tabs defaultValue="treatment">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="treatment" onClick={() => haptics.light()}><T text="Treatment" /></TabsTrigger>
                                    <TabsTrigger value="prevention" onClick={() => haptics.light()}><T text="Prevention" /></TabsTrigger>
                                </TabsList>
                                <TabsContent value="treatment" className="mt-4">
                                    <Tabs defaultValue="organic" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="organic" disabled={!treatmentAdvice?.organicSolutionRecommendation} onClick={() => haptics.light()}><Sprout className="mr-2 h-4 w-4" /><T text="Organic" /></TabsTrigger>
                                            <TabsTrigger value="pesticide" disabled={!treatmentAdvice?.pesticideRecommendation} onClick={() => haptics.light()}><TestTube2 className="mr-2 h-4 w-4" /><T text="Pesticide" /></TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="organic" className="mt-4 p-4 border rounded-md">
                                            {treatmentAdvice?.organicSolutionRecommendation ? (<>
                                                <h4 className="font-semibold mb-2">{translatedOrganicName || treatmentAdvice.organicSolutionRecommendation.name}</h4>
                                                <p className="text-sm text-muted-foreground mb-2"><strong><T text="Preparation" />:</strong> {translatedOrganicPrep || treatmentAdvice.organicSolutionRecommendation.preparation}</p>
                                                <p className="text-sm text-muted-foreground"><strong><T text="Application" />:</strong> {translatedOrganicMethod || treatmentAdvice.organicSolutionRecommendation.applicationMethod}</p>
                                            </>) : <p className="text-sm text-muted-foreground"><T text="No organic treatment advice available." /></p>}
                                        </TabsContent>
                                        <TabsContent value="pesticide" className="mt-4 p-4 border rounded-md">
                                            {treatmentAdvice?.pesticideRecommendation ? (<>
                                                <h4 className="font-semibold mb-2">{translatedPesticideName || treatmentAdvice.pesticideRecommendation.name}</h4>
                                                <p className="text-sm text-muted-foreground mb-2"><strong><T text="Dosage" />:</strong> {translatedPesticideDosage || treatmentAdvice.pesticideRecommendation.dosage}</p>
                                                <p className="text-sm text-muted-foreground"><strong><T text="Application" />:</strong> {translatedPesticideMethod || treatmentAdvice.pesticideRecommendation.applicationMethod}</p>
                                            </>) : <p className="text-sm text-muted-foreground"><T text="No pesticide treatment advice available." /></p>}
                                        </TabsContent>
                                    </Tabs>
                                </TabsContent>
                                <TabsContent value="prevention" className="mt-4 p-4 border rounded-md">
                                    {treatmentAdvice?.preventionTips && treatmentAdvice.preventionTips.length > 0 ? (
                                        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                                            {treatmentAdvice.preventionTips.map(tip => <li key={tip}><T text={tip} /></li>)}
                                        </ul>
                                    ) : <p className="text-sm text-muted-foreground"><T text="No prevention tips available." /></p>}
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>

                <Button asChild className="w-full" size="lg" onClick={() => haptics.heavy()}>
                    <Link href={`/suppliers?cropType=${reportData?.cropType}&diseaseName=${isHealthy ? '' : reportData?.diagnosis.diseaseName}`}>
                        <MapPin className="mr-2 h-5 w-5" /> <T text="Find Nearby Suppliers" />
                    </Link>
                </Button>
            </main>
        </div>
    );
}
