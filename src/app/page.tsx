"use client";
import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import Image from "next/image";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type MemberData = {
  userId: string;
  displayName: string;
};

export default function Home() {
  const liffId = "2007937078-BYayrODq";
  const ADMIN_USER_ID = process.env.ADMIN_ID;

  const [profile, setProfile] = useState<Profile>();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const p = await liff.getProfile();
        setProfile(p);
        console.log(p);

        const memberData: MemberData = {
          userId: p.userId,
          displayName: p.displayName,
        };

        const createMemberResponse = await fetch("/api/create-member", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(memberData),
        });

        if (!createMemberResponse.ok) {
          throw new Error("Failed to create member data");
        }

        const checkStatusResponse = await fetch(
          `/api/check-member?userId=${p.userId}`
        );
        const statusData = await checkStatusResponse.json();
        setIsMember(statusData.isMember);
        setRole(statusData.role);

        console.log("User role:", statusData.role);
      } catch (error) {
        console.error(
          "Error initializing LIFF or handling member data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, [liffId, ADMIN_USER_ID]);

  const logout = async () => {
    liff.logout();
    window.location.reload();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!file || !profile?.userId) {
      alert("กรุณาเลือกไฟล์สลิป");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", profile.userId);
    formData.append("displayName", profile.displayName);

    try {
      const response = await fetch("/api/upload-slip", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("ส่งสลิปเรียบร้อยแล้ว กรุณารอการตรวจสอบจากร้านค้า");
        setShowPayment(false);
        setFile(null);
      } else {
        alert("การส่งสลิปล้มเหลว");
      }
    } catch (error) {
      console.error("Error uploading slip:", error);
      alert("เกิดข้อผิดพลาดในการส่งสลิป");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-lg font-medium text-gray-700">
              กำลังโหลด...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg text-red-600 font-medium">
            เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ กรุณารอสักครู่
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center mb-2">
              🧺 ร้านซักรีดออนไลน์
            </h1>
            <p className="text-blue-100 text-center text-sm sm:text-base">
              บริการซักรีดคุณภาพ สะดวก รวดเร็ว
            </p>
          </div>

          {/* Profile Section */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
              <div className="relative">
                <Image
                  width={1500}
                  height={1500}
                  src={profile.pictureUrl ?? ""}
                  alt="profile"
                  className="rounded-full w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                  สวัสดี {profile.displayName} 👋
                </h2>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      role === "admin"
                        ? "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200"
                        : "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {role === "admin" ? "👑 ผู้ดูแลระบบ" : "👤 ผู้ใช้งาน"}
                  </span>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isMember
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                        : "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border border-orange-200"
                    }`}
                  >
                    {isMember ? "✅ สมาชิกปัจจุบัน" : "⏳ ยังไม่เป็นสมาชิก"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {role === "admin" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => (window.location.href = "/admin")}
                    className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center space-x-2">
                      <span>⚙️</span>
                      <span>เข้าสู่หน้าผู้ดูแลระบบ</span>
                    </div>
                  </button>

                  <button
                    onClick={logout}
                    className="group relative overflow-hidden bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center space-x-2">
                      <span>🚪</span>
                      <span>ออกจากระบบ</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isMember && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-xl shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">⚠️</div>
                        <div>
                          <h3 className="font-semibold text-yellow-800 mb-1">
                            แจ้งเตือนการสมัครสมาชิก
                          </h3>
                          <p className="text-yellow-700 text-sm">
                            คุณยังไม่เป็นสมาชิก
                            กรุณาชำระค่าสมาชิกรายเดือนเพื่อใช้บริการ
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowPayment(true)}
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center space-x-2">
                        <span>💳</span>
                        <span>ชำระค่าสมาชิกรายเดือน</span>
                      </div>
                    </button>

                    <button
                      onClick={logout}
                      className="group relative overflow-hidden bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center space-x-2">
                        <span>🚪</span>
                        <span>ออกจากระบบ</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-t-3xl">
                <h2 className="text-2xl font-bold text-white text-center flex items-center justify-center space-x-2">
                  <span>💰</span>
                  <span>ชำระเงิน</span>
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* QR Code Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 text-center">
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center justify-center space-x-2">
                      <span>📱</span>
                      <span>สแกน QR Code เพื่อชำระเงิน</span>
                    </h3>
                    <p className="text-sm text-gray-600">
                      ใช้แอปธนาคารหรือ True Wallet สแกนชำระ
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-lg mx-auto w-fit">
                    <Image
                      width={200}
                      height={300}
                      src="/promppay.jpg"
                      alt="QR Code PromptPay"
                      className="w-48 h-72 object-contain mx-auto"
                    />
                  </div>

                  <div className="mt-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4">
                    <p className="font-bold text-xl text-green-800">
                      💸 ราคา: 299 บาท/เดือน
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      รวมบริการซักรีดไม่จำกัด
                    </p>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <span>📄</span>
                    <span>อัปโหลดสลิปการโอนเงิน</span>
                  </label>

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {file && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 flex items-center space-x-2">
                          <span>✅</span>
                          <span>เลือกไฟล์: {file.name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPayment(false);
                      setFile(null);
                    }}
                    className="group relative overflow-hidden bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    disabled={uploading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-500 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center space-x-2">
                      <span>❌</span>
                      <span>ยกเลิก</span>
                    </div>
                  </button>

                  <button
                    onClick={handlePaymentSubmit}
                    disabled={!file || uploading}
                    className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center space-x-2">
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>กำลังส่ง...</span>
                        </>
                      ) : (
                        <>
                          <span>📤</span>
                          <span>ส่งสลิป</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
