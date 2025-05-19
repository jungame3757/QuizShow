import React from 'react';
import QRCode from 'react-qr-code';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrValue: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, qrValue }) => {
  if (!isOpen || !qrValue) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">QR 코드</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="p-4 bg-white flex justify-center mb-4">
          <QRCode 
            value={qrValue}
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        <p className="text-sm text-gray-600 text-center mb-4">
          이 QR 코드를 스캔하여 퀴즈에 참여하세요
        </p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal; 