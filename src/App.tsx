import React, { useState } from 'react';
import { PurchasingProvider, usePurchasing } from './context/PurchasingContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { RequisitionView } from './components/requisition/RequisitionView';
import { PurchaseOrderView } from './components/po/PurchaseOrderView';
import { GoodsReceiptView } from './components/receipt/GoodsReceiptView';
import { WarehouseView } from './components/warehouse/WarehouseView';
import { SupplierView } from './components/suppliers/SupplierView';
import { RackQRScanModal } from './components/rack/RackQRScanModal';
import { RackQRLabelModal } from './components/rack/RackQRLabelModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PurchaseRequisition, PurchaseOrder, WarehouseItem } from './types';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, items } = usePurchasing();

  // Cross-module states
  const [isPRCreateOpen, setIsPRCreateOpen] = useState(false);
  const [isPOCreateOpen, setIsPOCreateOpen] = useState(false);
  const [isGRNCreateOpen, setIsGRNCreateOpen] = useState(false);

  // QR Tracker States
  const [isQRScanOpen, setIsQRScanOpen] = useState(false);
  const [selectedItemForQRScan, setSelectedItemForQRScan] = useState<WarehouseItem | null>(null);
  const [isQRLabelOpen, setIsQRLabelOpen] = useState(false);
  const [selectedItemForQRLabel, setSelectedItemForQRLabel] = useState<WarehouseItem | null>(null);

  const [prefilledPRForPO, setPrefilledPRForPO] = useState<PurchaseRequisition | null>(null);
  const [preselectedPOForGRN, setPreselectedPOForGRN] = useState<PurchaseOrder | null>(null);

  // Workflow Handlers
  const handleConvertToPOFromPR = (pr: PurchaseRequisition) => {
    setPrefilledPRForPO(pr);
    setActiveTab('purchase_orders');
    setIsPOCreateOpen(true);
  };

  const handleOpenGRNForPO = (po: PurchaseOrder) => {
    setPreselectedPOForGRN(po);
    setActiveTab('goods_receipts');
    setIsGRNCreateOpen(true);
  };

  const handleCreatePRForItem = (item: WarehouseItem) => {
    setActiveTab('requisitions');
    setIsPRCreateOpen(true);
  };

  const handleOpenQRLabelModal = (item?: WarehouseItem) => {
    setSelectedItemForQRLabel(item || null);
    setIsQRLabelOpen(true);
  };

  const handleOpenDeepTrackForItem = (item: WarehouseItem) => {
    setSelectedItemForQRScan(item);
    setIsQRScanOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <Header onOpenScanQR={() => {
        setSelectedItemForQRScan(null);
        setIsQRScanOpen(true);
      }} />

      {/* Main Content with bottom padding to account for mobile BottomNav */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenCreatePR={() => {
              setActiveTab('requisitions');
              setIsPRCreateOpen(true);
            }}
            onOpenCreatePO={() => {
              setPrefilledPRForPO(null);
              setActiveTab('purchase_orders');
              setIsPOCreateOpen(true);
            }}
            onOpenCreateGRN={() => {
              setPreselectedPOForGRN(null);
              setActiveTab('goods_receipts');
              setIsGRNCreateOpen(true);
            }}
            onOpenScanQR={() => {
              setSelectedItemForQRScan(null);
              setIsQRScanOpen(true);
            }}
          />
        )}

        {activeTab === 'requisitions' && (
          <RequisitionView
            isCreateModalOpen={isPRCreateOpen}
            setIsCreateModalOpen={setIsPRCreateOpen}
            onConvertToPOFromPR={handleConvertToPOFromPR}
          />
        )}

        {activeTab === 'purchase_orders' && (
          <PurchaseOrderView
            isCreateModalOpen={isPOCreateOpen}
            setIsCreateModalOpen={setIsPOCreateOpen}
            prefilledPR={prefilledPRForPO}
            setPrefilledPR={setPrefilledPRForPO}
            onOpenCreateGRNForPO={handleOpenGRNForPO}
          />
        )}

        {activeTab === 'goods_receipts' && (
          <GoodsReceiptView
            isCreateModalOpen={isGRNCreateOpen}
            setIsCreateModalOpen={setIsGRNCreateOpen}
            preselectedPO={preselectedPOForGRN}
            setPreselectedPO={setPreselectedPOForGRN}
          />
        )}

        {activeTab === 'warehouse' && (
          <WarehouseView
            onOpenCreatePRForItem={handleCreatePRForItem}
            onOpenScanQR={() => {
              setSelectedItemForQRScan(null);
              setIsQRScanOpen(true);
            }}
            onOpenPrintLabel={handleOpenQRLabelModal}
            onOpenDeepTrack={handleOpenDeepTrackForItem}
          />
        )}

        {activeTab === 'suppliers' && <SupplierView />}
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar with Floating Scan QR button */}
      <BottomNav onOpenScanQR={() => {
        setSelectedItemForQRScan(null);
        setIsQRScanOpen(true);
      }} />

      {/* Rack QR Tracking Scanner Modal */}
      <RackQRScanModal
        isOpen={isQRScanOpen}
        preselectedItem={selectedItemForQRScan}
        onClose={() => {
          setIsQRScanOpen(false);
          setSelectedItemForQRScan(null);
        }}
        onOpenCreatePR={(item) => {
          setIsQRScanOpen(false);
          handleCreatePRForItem(item);
        }}
        onOpenGRN={(po) => {
          setIsQRScanOpen(false);
          handleOpenGRNForPO(po);
        }}
        onPrintLabel={(item) => {
          setSelectedItemForQRLabel(item);
          setIsQRLabelOpen(true);
        }}
      />

      {/* Rack QR Label Print Modal */}
      <RackQRLabelModal
        isOpen={isQRLabelOpen}
        onClose={() => {
          setIsQRLabelOpen(false);
          setSelectedItemForQRLabel(null);
        }}
        items={items}
        preselectedItem={selectedItemForQRLabel}
      />

      {/* Desktop Footer */}
      <footer className="bg-white border-t border-slate-200/80 text-slate-500 py-5 mt-auto text-xs no-print hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
              K
            </div>
            <span className="font-bold text-slate-800">KIRI PURCHASING</span>
            <span className="text-slate-400">&bull; Sistem Pengadaan & Database Gudang Terintegrasi</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span>Pemesanan (PR)</span>
            <span>&bull;</span>
            <span>Purchase Order (PO)</span>
            <span>&bull;</span>
            <span>Penerimaan (GRN)</span>
            <span>&bull;</span>
            <span>Warehouse DB</span>
            <span>&bull;</span>
            <span>QR Tracking</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Terjadi Kendala Pada Aplikasi Kiri Purchasing">
      <PurchasingProvider>
        <MainContent />
      </PurchasingProvider>
    </ErrorBoundary>
  );
}
