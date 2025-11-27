import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

const CTA = () => {
    return (
        <div className="bg-indigo-700">
            <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                    <span className="block">Sẵn sàng bùng nổ doanh số?</span>
                    <span className="block">Bắt đầu dùng thử miễn phí ngay hôm nay.</span>
                </h2>
                <p className="mt-4 text-lg leading-6 text-indigo-200">
                    Đừng để đối thủ vượt mặt. Hãy để KuserNew giúp bạn chiếm lĩnh vị trí top đầu trên Google.
                </p>
                <div className="mt-8 flex justify-center">
                    <div className="inline-flex rounded-md shadow">
                        <Link href="/signup">
                            <Button className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 sm:w-auto">
                                Đăng Ký Ngay
                            </Button>
                        </Link>
                    </div>
                    <div className="ml-3 inline-flex">
                        <Link href="/login">
                            <Button variant="secondary" className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-800 hover:bg-indigo-900 sm:w-auto">
                                Đăng Nhập
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CTA;
