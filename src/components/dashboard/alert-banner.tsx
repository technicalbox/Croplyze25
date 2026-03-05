import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function AlertBanner() {
    const { t } = useTranslation();
    return (
        <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">{t('dashboard.alertTitle')}</AlertTitle>
            <AlertDescription>
                {t('dashboard.alertDescription')}
            </AlertDescription>
        </Alert>
    )
}
