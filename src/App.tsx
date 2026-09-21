import React, { useEffect, useState } from 'react';
import { PurchasingProvider, usePurchasing } from './context/PurchasingContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { RequisitionView } from './components/requisition/RequisitionView';
import { PurchaseOrderView } from './components/po/PurchaseOrderView';
import { GoodsReceiptView } from './components/receipt/GoodsReceiptView';
import { WarehouseView } from './components/warehouse/WarehouseView';
import { SupplierView } from './components/suppliers/SupplierView';
import { RackQRScanModal } from './components/rack/RackQRScanModal';
import { RackQRLabelModal } from './components/rack/RackQRLabelModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthGate } from './components/auth/AuthGate';
import { CloudSync } from './components/common/CloudSync';
import { PurchaseRequisition, PurchaseOrder, WarehouseItem } from './types';
import { useAuth } from './components/auth/AuthContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StockOpnameView } from './components/opname/StockOpnameView';
import { StoreTransferView } from './components/transfer/StoreTransferView';
import { canScanWarehouse, ROLE_TABS } from './lib/permissions';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, items } = usePurchasing();
  const { profile } = useAuth();
  const canScan = canScanWarehouse(profile.role);

  useEffect(() => {
    if (!ROLE_TABS[profile.role].includes(activeTab)) setActiveTab('dashboard');
  }, [activeTab, profile.role, setActiveTab]);

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
    <div className="min-h-screen bg-[#f3f2ef] font-sans antialiased text-[#242424]">
      <Sidebar onOpenScanQR={canScan ? () => {
        setSelectedItemForQRScan(null);
        setIsQRScanOpen(true);
      } : undefined} />

      <div className="min-h-screen md:pl-[248px] flex flex-col">
      <Header onOpenScanQR={canScan ? () => {
        setSelectedItemForQRScan(null);
        setIsQRScanOpen(true);
      } : undefined} />

      {/* Main Content with bottom padding to account for mobile BottomNav */}
      <main className={`flex-1 w-full mx-auto ${activeTab === 'requisitions' && isPRCreateOpen
        ? 'max-w-none p-0'
        : 'max-w-[1560px] px-3 py-3 pb-28 sm:px-5 sm:py-5 lg:px-7 md:pb-8'
      }`}>
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
            onOpenScanQR={canScan ? () => {
              setSelectedItemForQRScan(null);
              setIsQRScanOpen(true);
            } : undefined}
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
        {activeTab === 'stock_opname' && <StockOpnameView />}
        {activeTab === 'store_transfers' && <StoreTransferView />}
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar with Floating Scan QR button */}
      {!isPRCreateOpen && !isPOCreateOpen && <BottomNav onOpenScanQR={canScan ? () => {
        setSelectedItemForQRScan(null);
        setIsQRScanOpen(true);
      } : undefined} />}

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

      <footer className="no-print mt-auto hidden border-t border-[#e7e5e0] px-7 py-4 text-[11px] text-[#888781] md:flex md:items-center md:justify-between">
        <span>Kiri Supply · Pengadaan & inventaris terintegrasi</span>
        <span>PR · PO · Penerimaan · Warehouse</span>
      </footer>
      </div>
    </div>
  );
};

export default function App() {
  const isAdmin = /^\/admin\/?$/.test(window.location.pathname);
  return (
    <ErrorBoundary fallbackTitle="Terjadi Kendala Pada Aplikasi Kiri Purchasing">
      {isAdmin ? (
        <AuthGate requiredRole="master" allowRegistration={false} loadCloudSnapshot={false}>
          <AdminDashboard />
        </AuthGate>
      ) : (
        <AuthGate>
          <PurchasingProvider>
            <CloudSync />
            <MainContent />
          </PurchasingProvider>
        </AuthGate>
      )}
    </ErrorBoundary>
  );
}
