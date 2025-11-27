'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Shield, ArrowRight, Calendar } from 'lucide-react';

const plans = [
    {
        name: 'Basic',
        price: '99,000',
        period: '/ tháng',
        description: 'Phù hợp cho cá nhân mới bắt đầu',
        features: [
            '10 bài viết / tháng',
            '1,000 lượt xem',
            'Hỗ trợ email',
            '6,000 điểm khởi đầu',
        ],
        icon: Zap,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        name: 'Pro',
        price: '299,000',
        period: '/ tháng',
        description: 'Dành cho người dùng chuyên nghiệp',
        features: [
            'Không giới hạn bài viết',
            '10,000 lượt xem',
            'Hỗ trợ ưu tiên',
            '10,000 điểm khởi đầu',
            'Phân tích chi tiết',
        ],
        icon: Crown,
        color: 'from-purple-500 to-pink-500',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: '999,000',
        period: '/ tháng',
        description: 'Giải pháp cho doanh nghiệp',
        features: [
            'Không giới hạn mọi thứ',
            'Hỗ trợ 24/7',
            '20,000 điểm khởi đầu',
            'API access',
            'Quản lý team',
            'Custom domain',
        ],
        icon: Shield,
        color: 'from-orange-500 to-red-500',
    },
];

export default function PricingPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="container mx-auto px-4 py-8">
                <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                    <span>Quay lại trang chủ</span>
                </Link>
            </div>

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto"
                >
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Chọn gói phù hợp với bạn
                    </h1>
                    <p className="text-xl text-gray-400 mb-8">
                        Nâng cấp tài khoản để trải nghiệm đầy đủ tính năng
                    </p>

                    {user && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
                            <Calendar className="w-5 h-5" />
                            <span>Tài khoản của bạn đã hết hạn. Vui lòng chọn gói để tiếp tục sử dụng.</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Pricing Cards */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan, index) => {
                        const Icon = plan.icon;
                        return (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative"
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                                            Phổ biến nhất
                                        </span>
                                    </div>
                                )}

                                <div className={`relative h-full bg-gray-800/50 backdrop-blur-sm border ${plan.popular ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-gray-700'
                                    } rounded-2xl p-8 hover:scale-105 transition-transform duration-300`}>
                                    {/* Icon */}
                                    <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-6`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Plan Name */}
                                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                    <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                                    {/* Price */}
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold text-white">{plan.price}</span>
                                            <span className="text-gray-400">₫</span>
                                        </div>
                                        <span className="text-gray-400 text-sm">{plan.period}</span>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.popular
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                                                : 'bg-gray-700 text-white hover:bg-gray-600'
                                            }`}
                                    >
                                        Chọn gói {plan.name}
                                    </motion.button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* FAQ or Additional Info */}
            <div className="container mx-auto px-4 py-12 text-center">
                <p className="text-gray-400">
                    Cần hỗ trợ? Liên hệ với chúng tôi qua{' '}
                    <a href="mailto:support@kusernew.com" className="text-indigo-400 hover:text-indigo-300">
                        support@kusernew.com
                    </a>
                </p>
            </div>
        </div>
    );
}
