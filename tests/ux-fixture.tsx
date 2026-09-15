import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NumberInput } from '../src/components/common/NumberInput';
import { printDocument } from '../src/utils/printDocument';
import { PurchasingProvider } from '../src/context/PurchasingContext';
import { WarehouseView } from '../src/components/warehouse/WarehouseView';
import '../src/index.css';

function Fixture() {
  const [value, setValue] = useState(1);
  return <>
    <NumberInput aria-label="Quantity" value={value} onChange={e => setValue(parseFloat(e.target.value) || 1)} />
    <output id="numeric-value">{value}</output>
    <div className="fixed"><button id="print" onClick={e => void printDocument(e.currentTarget)}>Print</button>
      <div className="printable-area"><h1>SELECTED DOCUMENT</h1>
        {Array.from({ length: 100 }, (_, i) => <p key={i}>UNIQUE LINE {i}</p>)}
      </div>
    </div>
    <div className="printable-area">OTHER DOCUMENT MUST NOT PRINT</div>
    <PurchasingProvider><WarehouseView onOpenCreatePRForItem={() => {}} /></PurchasingProvider>
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
