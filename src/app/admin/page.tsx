"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type Payment = {
  id: string;
  slipPath: string;
  isApproved: boolean;
  createdAt: string;
  user: {
    displayName: string;
    userId: string;
  };
};

// Separate component that uses useSearchParams
function AdminContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedPayment, setHighlightedPayment] = useState<string | null>(
    null
  );

  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  useEffect(() => {
    fetchPendingPayments();

    // ถ้ามี paymentId ใน URL ให้ไฮไลท์
    if (paymentId) {
      setHighlightedPayment(paymentId);

      // เลื่อนไปยังสลิปที่ต้องการอนุมัติหลังจากโหลดข้อมูลเสร็จ
      setTimeout(() => {
        const element = document.getElementById(`payment-${paymentId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // กะพริบเพื่อให้เห็นชัดเจน
          element.classList.add("animate-pulse");
          setTimeout(() => {
            element.classList.remove("animate-pulse");
          }, 3000);
        }
      }, 500);
    }
  }, [paymentId]);

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch("/api/admin/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      if (response.ok) {
        alert("อนุมัติการชำระเงินเรียบร้อย");
        setHighlightedPayment(null); // ลบการไฮไลท์หลังอนุมัติ
        fetchPendingPayments(); // Refresh the list
      } else {
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (error) {
      console.error("Error approving payment:", error);
      alert("เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      const response = await fetch("/api/admin/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      if (response.ok) {
        alert("ปฏิเสธการชำระเงินเรียบร้อย");
        setHighlightedPayment(null); // ลบการไฮไลท์หลังปฏิเสธ
        fetchPendingPayments(); // Refresh the list
      } else {
        alert("เกิดข้อผิดพลาดในการปฏิเสธ");
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      alert("เกิดข้อผิดพลาดในการปฏิเสธ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        จัดการการชำระเงิน
        {highlightedPayment && (
          <span className="ml-2 text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
            🎯 กำลังดูสลิปที่ส่งมา
          </span>
        )}
      </h1>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ไม่มีการชำระเงินรอการอนุมัติ
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => {
            const isHighlighted = highlightedPayment === payment.id;

            return (
              <div
                key={payment.id}
                id={`payment-${payment.id}`}
                className={`
                  rounded-lg shadow-md p-6 transition-all duration-300
                  ${
                    isHighlighted
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-lg transform scale-[1.02]"
                      : "bg-white hover:shadow-lg"
                  }
                `}
              >
                {/* แสดงป้ายเตือนถ้าเป็นสลิปที่ไฮไลท์ */}
                {isHighlighted && (
                  <div className="mb-4 flex items-center gap-2 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="font-semibold text-yellow-800">
                        สลิปที่ส่งมาใหม่
                      </div>
                      <div className="text-sm text-yellow-700">
                        นี่คือสลิปที่ส่งมาผ่าน LINE Bot เมื่อสักครู่
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      {payment.user.displayName}
                      {isHighlighted && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                          ใหม่
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 text-sm mb-1">
                      User ID: {payment.user.userId}
                    </p>
                    <p className="text-gray-600 text-sm mb-1">
                      Payment ID: {payment.id}
                    </p>
                    <p className="text-gray-600 text-sm mb-4">
                      วันที่ส่ง:{" "}
                      {new Date(payment.createdAt).toLocaleString("th-TH")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className={`
                          px-4 py-2 rounded-lg transition-colors duration-200
                          ${
                            isHighlighted
                              ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          }
                        `}
                      >
                        {isHighlighted ? "✅ อนุมัติสลิปนี้" : "อนุมัติ"}
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        className={`
                          px-4 py-2 rounded-lg transition-colors duration-200
                          ${
                            isHighlighted
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                              : "bg-red-500 hover:bg-red-600 text-white"
                          }
                        `}
                      >
                        {isHighlighted ? "❌ ปฏิเสธสลิปนี้" : "ปฏิเสธ"}
                      </button>
                    </div>
                  </div>
                  <div className="md:w-64">
                    <div
                      className={`
                      ${
                        isHighlighted
                          ? "ring-4 ring-yellow-300 ring-opacity-50"
                          : ""
                      }
                      rounded-lg overflow-hidden
                    `}
                    >
                      <Image
                        width={1500}
                        height={1500}
                        src={payment.slipPath}
                        alt="Payment slip"
                        className="w-full h-auto border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">กำลังโหลด...</div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent />
    </Suspense>
  );
}
