"use client";

import React, { Suspense } from "react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PaymentDetails = () => {
  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4 gradient-title">
        Successful Payment
      </h1>
      <p className="text-lg text-gray-700 mb-8">Thank you for your payment</p>
      <div className="w-64 h-64 mx-auto mb-8">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdr1DMONakU9MUecTXVHg290MknEaXlFRhrA&s"
          alt="Success"
          className="object-cover w-full h-full rounded-lg hover:scale-105 transition-all"
        />
      </div>
      <div className="mt-8">
        <h2 className="text-xl text-gray-700 mb-4">
          Continue Creating Course From Your Amazing AI Support
        </h2>
        <Link href="/dashboard">
          <Button variant="sex" className="w-full py-3 text-lg">
            Create More...
          </Button>
        </Link>
      </div>
    </div>
  );
};

const PaymentSuccessPage = () => {
  return (
    <>
      <Head>
        <title>Payment Success</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black to-white">
        <Suspense fallback={<p>Loading...</p>}>
          <PaymentDetails />
        </Suspense>
      </div>
    </>
  );
};

export default PaymentSuccessPage;
