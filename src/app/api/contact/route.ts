import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Log the contact form submission
    // TODO: Connect to email service (SendGrid, Resend, AWS SES, etc.)
    // For now, we just log it
    console.log('📧 Contact Form Submission:', {
      timestamp: new Date().toISOString(),
      name,
      email,
      subject,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    });

    // TODO: Send email notification
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'Pick Marketplace <noreply@pickmarketplace.com>',
    //   to: 'support@pickmarketplace.com',
    //   subject: `Contact Form: ${subject}`,
    //   html: `
    //     <p><strong>From:</strong> ${name} (${email})</p>
    //     <p><strong>Subject:</strong> ${subject}</p>
    //     <p><strong>Message:</strong></p>
    //     <p>${message}</p>
    //   `,
    // });

    return NextResponse.json(
      { success: true, message: 'Message received' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
