import React from 'react';
import { Copy, Check, LinkIcon, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

interface InviteTabProps {
  sessionCode: string;
  qrValue: string;
  isCopied: boolean;
  onCopySessionCode: () => void;
  onCopyJoinUrl: () => void;
  onShowQRCode: () => void;
}

const InviteTab: React.FC<InviteTabProps> = ({
  sessionCode,
  qrValue,
  isCopied,
  onCopySessionCode,
  onCopyJoinUrl,
  onShowQRCode
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">참가자 초대하기</h3>
        <p className="text-gray-600 mb-4">아래 방법 중 하나로 참가자들을 초대하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-gray-50 p-6 rounded-xl text-center">
          <h4 className="font-medium text-lg text-gray-800 mb-3">초대 정보</h4>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">참가 코드</p>
            <div className="bg-white py-3 px-4 rounded-lg border border-purple-200 mb-2">
              <span className="text-3xl font-bold tracking-wider text-purple-700">{sessionCode}</span>
            </div>
            <button
              onClick={onCopySessionCode}
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              {isCopied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
              코드 복사하기
            </button>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-1">참가 링크</p>
            <div className="bg-white py-3 px-4 rounded-lg border border-purple-200 mb-2 overflow-hidden">
              <p className="text-purple-600 truncate">{qrValue}</p>
            </div>
            <button
              onClick={onCopyJoinUrl}
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              {isCopied ? <Check size={16} className="mr-2" /> : <LinkIcon size={16} className="mr-2" />}
              링크 복사하기
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-xl text-center">
          <h4 className="font-medium text-lg text-gray-800 mb-3">QR 코드</h4>
          <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4 flex justify-center">
            {qrValue ? (
              <div className="p-2 bg-white">
                <QRCode 
                  value={qrValue}
                  size={150}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            ) : (
              <p className="text-gray-500">QR 코드를 생성할 수 없습니다.</p>
            )}
          </div>
          <button
            onClick={onShowQRCode}
            className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <QrCode size={16} className="mr-2" />
            크게 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteTab; 