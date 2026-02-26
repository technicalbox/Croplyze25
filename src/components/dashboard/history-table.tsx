'use client';

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Diagnosis } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { useTranslation } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore } from "@/firebase";
import { useNotification } from "@/providers/notification-provider";
import { doc, deleteDoc } from "firebase/firestore";
import { haptics } from "@/lib/haptics";


const severityVariantMap = {
  High: "destructive",
  Medium: "warning",
  Low: "success",
  'Not Applicable': 'default',
} as const;

export default function HistoryTable({ diagnoses }: { diagnoses: Diagnosis[] }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const addNotification = useNotification();
  const [diagnosisToDelete, setDiagnosisToDelete] = useState<Diagnosis | null>(null);

  const severityTranslationMap = {
    'High': t('dashboard.historyTable.severityLevel.high'),
    'Medium': t('dashboard.historyTable.severityLevel.medium'),
    'Low': t('dashboard.historyTable.severityLevel.low'),
    'Not Applicable': t('dashboard.historyTable.severityLevel.notApplicable'),
  } as const;

  const handleDeleteConfirm = async () => {
    if (!diagnosisToDelete || !user) return;
    haptics.heavy();

    try {
      const docRef = doc(firestore, 'users', user.uid, 'cropDiagnoses', diagnosisToDelete.id);
      await deleteDoc(docRef);
      haptics.success();
      addNotification({
        type: 'success',
        title: t('dashboard.deleteDialog.successTitle'),
        message: t('dashboard.deleteDialog.successDescription').replace('{cropType}', diagnosisToDelete.cropType),
      });
    } catch (error) {
      console.error("Error deleting document: ", error);
      haptics.error();
      addNotification({
        type: "error",
        title: t('dashboard.deleteDialog.errorTitle'),
        message: t('dashboard.deleteDialog.errorDescription'),
      });
    } finally {
      setDiagnosisToDelete(null);
    }
  };

  const openDeleteDialog = (diagnosis: Diagnosis) => {
    haptics.light();
    setDiagnosisToDelete(diagnosis);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px] table-cell">
                <span className="sr-only">{t('dashboard.historyTable.image')}</span>
              </TableHead>
              <TableHead>{t('dashboard.historyTable.crop')}</TableHead>
              <TableHead>{t('dashboard.historyTable.diagnosis')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('dashboard.historyTable.severity')}</TableHead>
              <TableHead className="text-right">{t('dashboard.historyTable.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diagnoses.map((diagnosis) => (
              <TableRow key={diagnosis.id}>
                <TableCell className="table-cell p-2">
                  <Image
                    alt={diagnosis.cropType}
                    className="aspect-square rounded-md object-cover"
                    height="48"
                    src={diagnosis.image}
                    width="48"
                  />
                </TableCell>
                <TableCell className="font-medium break-words whitespace-normal">{diagnosis.cropType}</TableCell>
                <TableCell className="break-words whitespace-normal">{diagnosis.diagnosis.diseaseName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {diagnosis.diagnosis.diseaseName === 'Healthy' || diagnosis.diagnosis.diseaseName === 'No disease detected' ? (
                    <Badge variant={'success'}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {t('dashboard.historyTable.healthy')}
                    </Badge>
                  ) : (
                    <Badge variant={severityVariantMap[diagnosis.diagnosis.severityLevel]}>
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                      {severityTranslationMap[diagnosis.diagnosis.severityLevel]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={`/scan/${diagnosis.id}`}>
                                <ArrowRight className="h-4 w-4" />
                                <span className="sr-only">{t('dashboard.historyTable.viewDetails')}</span>
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(diagnosis)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!diagnosisToDelete} onOpenChange={(isOpen) => { if (!isOpen) setDiagnosisToDelete(null)}}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('dashboard.deleteDialog.description').replace('{cropType}', diagnosisToDelete?.cropType || '')}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => haptics.light()}>{t('dashboard.deleteDialog.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>
                    {t('dashboard.deleteDialog.delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
