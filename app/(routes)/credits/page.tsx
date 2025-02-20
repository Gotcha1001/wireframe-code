"use client";
import { useAuthContext } from "@/app/provider";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CreditOption {
  credits: number;
  amount: number;
}

interface User {
  email: string;
  credits?: number;
}

interface UserData {
  credits: number;
}

const creditsOptions: CreditOption[] = [
  { credits: 5, amount: 10 },
  { credits: 10, amount: 100 },
  { credits: 20, amount: 200 },
  { credits: 50, amount: 500 },
];

function Credits() {
  const { user } = useAuthContext() as { user: User | null };
  const [userData, setUserData] = useState<UserData | undefined>();
  const [selectedOption, setSelectedOption] = useState<CreditOption | null>(
    null
  );
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  useEffect(() => {
    user && GetUserCredits();
  }, [user]);

  const GetUserCredits = async () => {
    try {
      const result = await axios.get("/api/user?email=" + user?.email);
      setUserData(result.data);
    } catch (error) {
      console.error("Error fetching user credits:", error);
      toast.error("Failed to fetch user credits");
    }
  };

  const initiatePayment = async () => {
    if (!selectedOption) {
      toast.error("Please select a credit package");
      return;
    }

    if (!user?.email) {
      toast.error("Please log in to purchase credits");
      return;
    }

    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedOption.amount,
          credits: selectedOption.credits,
          userEmail: user.email,
          itemName: `${selectedOption.credits} Credits`,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to initiate payment");
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate payment");
      }
    } catch (error) {
      toast.error("Error initiating payment");
      console.error(error);
    }
  };

  return (
    <div>
      <h2 className="text-4xl text-center font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 text-transparent bg-clip-text">
        Credits
      </h2>

      {/* Current Credits Display */}
      <div className="p-5 bg-slate-50 rounded-lg shadow-lg border border-teal-500 flex justify-between items-center mt-6">
        <div>
          <h2 className="font-bold text-xl">My Credits:</h2>
          <p className="text-lg">{userData?.credits ?? 0} Credits Left</p>
        </div>
        <Button
          variant="sex1"
          onClick={() => setShowPaymentOptions(!showPaymentOptions)}
        >
          Buy More Credits
        </Button>
      </div>

      {/* Payment Options */}
      {showPaymentOptions && (
        <div className="p-5 bg-slate-50 rounded-lg shadow-lg border border-teal-500 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditsOptions.map((option, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border relative cursor-pointer transition-all duration-300 ${
                  selectedOption?.credits === option.credits
                    ? "border-teal-500 bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-400 text-white shadow-lg"
                    : "border-gray-200 hover:border-teal-300 hover:shadow-md"
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold">
                    {option.credits} Credits
                  </h3>
                  <p className="text-lg font-medium">R{option.amount}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedOption && (
            <div className="mt-6 text-center">
              <Button
                className="w-full md:w-auto px-8 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 hover:opacity-90 text-white rounded-lg"
                onClick={initiatePayment}
              >
                Pay R{selectedOption.amount} with PayFast
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Credits;
