import { db } from "@/configs/db";
import { usersTable, WireframeToCodeTable } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { description, imageUrl, model, uid, email } = await req.json();

  const creditResult = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (creditResult[0]?.credits && creditResult[0]?.credits > 0) {
    const result = await db
      .insert(WireframeToCodeTable)
      .values({
        uid: uid,
        description: description,
        imageUrl: imageUrl,
        model: model,
        createdBy: email,
      })
      .returning({ id: WireframeToCodeTable.id });

    // Updating user credits
    const data = await db
      .update(usersTable)
      .set({
        credits: creditResult[0]?.credits - 1,
      })
      .where(eq(usersTable.email, email));

    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: "Not enough credits" });
  }
}

export async function GET(req: NextResponse) {
  const reqUrl = req.url;
  const { searchParams } = new URL(reqUrl);
  const uid = searchParams?.get("uid");
  const email = searchParams?.get("email");

  if (uid) {
    const result = await db
      .select()
      .from(WireframeToCodeTable)
      .where(eq(WireframeToCodeTable.uid, uid));
    return NextResponse.json(result[0]);
  } else if (email) {
    const result = await db
      .select()
      .from(WireframeToCodeTable)
      .where(eq(WireframeToCodeTable.createdBy, email));
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "No Record Found..." });
}

export async function PUT(req: NextRequest) {
  try {
    const { uid, codeResp } = await req.json();

    let codeToSave;
    if (typeof codeResp === "object") {
      const extractDeepestResp = (obj: any) => {
        if (!obj || typeof obj !== "object" || !obj.resp) {
          return obj;
        }
        return extractDeepestResp(obj.resp);
      };

      codeToSave = { resp: extractDeepestResp(codeResp) };
    } else {
      codeToSave = { resp: codeResp };
    }

    const result = await db
      .update(WireframeToCodeTable)
      .set({
        code: codeToSave,
      })
      .where(eq(WireframeToCodeTable.uid, uid))
      .returning({ uid: WireframeToCodeTable.uid });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const reqUrl = req.url;
    const { searchParams } = new URL(reqUrl);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");

    // Validate required parameters
    if (!uid || !email) {
      return NextResponse.json(
        { error: "Missing required parameters: uid and email" },
        { status: 400 }
      );
    }

    // First verify the record exists and belongs to the user
    const existingRecord = await db
      .select()
      .from(WireframeToCodeTable)
      .where(
        and(
          eq(WireframeToCodeTable.uid, uid),
          eq(WireframeToCodeTable.createdBy, email)
        )
      );

    if (!existingRecord.length) {
      return NextResponse.json(
        { error: "Record not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the record
    const result = await db
      .delete(WireframeToCodeTable)
      .where(
        and(
          eq(WireframeToCodeTable.uid, uid),
          eq(WireframeToCodeTable.createdBy, email)
        )
      )
      .returning({
        id: WireframeToCodeTable.id,
        uid: WireframeToCodeTable.uid,
      });

    return NextResponse.json({
      message: "Record deleted successfully",
      deletedRecord: result[0],
    });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
