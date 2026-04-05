const Case = require('../models/Case');
const Invoice = require('../models/Invoice');
const CalendarEvent = require('../models/CalendarEvent');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/workflow/alerts - Generate rule-based alerts
exports.getWorkflowAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  const alerts = [];

  // Filter by role
  let caseFilter = {};
  if (req.user.role === 'lawyer') {
    caseFilter = { advocate: req.user._id };
  } else if (req.user.role === 'client') {
    caseFilter = { client: req.user.linkedClientId };
  }

  // 1. Upcoming hearings (within 3 days)
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000);
  const casesWithHearings = await Case.find({
    ...caseFilter,
    status: 'Active',
    nextHearingDate: { $ne: '' }
  });

  casesWithHearings.forEach(cs => {
    if (!cs.nextHearingDate) return;
    const hearingDate = new Date(cs.nextHearingDate);
    const daysUntil = Math.ceil((hearingDate - now) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 3) {
      alerts.push({
        type: 'hearing',
        severity: daysUntil === 0 ? 'critical' : daysUntil === 1 ? 'high' : 'medium',
        title: `Hearing ${daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`}`,
        message: `${cs.title} (${cs.caseNumber}) at ${cs.courtName}`,
        caseId: cs._id,
        date: cs.nextHearingDate
      });
    }
  });

  // 2. Overdue invoices
  const overdueInvoices = await Invoice.find({ status: 'Overdue' });
  overdueInvoices.forEach(inv => {
    if (!inv.dueDate) return;
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.ceil((now - dueDate) / 86400000);
    alerts.push({
      type: 'invoice',
      severity: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium',
      title: `Invoice ${inv.invoiceNumber} overdue by ${daysOverdue} days`,
      message: `${inv.clientName} - ₹${inv.total?.toLocaleString('en-IN')}`,
      caseId: inv.caseId,
      date: inv.dueDate
    });
  });

  // 3. Overdue tasks
  const overdueTasks = await Task.find({ status: { $ne: 'Completed' }, dueDate: { $lt: now } });
  overdueTasks.forEach(task => {
    const daysOverdue = Math.ceil((now - new Date(task.dueDate)) / 86400000);
    alerts.push({
      type: 'task',
      severity: daysOverdue > 7 ? 'high' : 'medium',
      title: `Task overdue: ${task.title}`,
      message: `Due ${daysOverdue} days ago`,
      caseId: task.caseId,
      date: task.dueDate
    });
  });

  // 4. Filing deadlines within 7 days
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
  casesWithHearings.forEach(cs => {
    if (!cs.filingDeadline) return;
    const deadline = new Date(cs.filingDeadline);
    const daysUntil = Math.ceil((deadline - now) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 7) {
      alerts.push({
        type: 'deadline',
        severity: daysUntil <= 2 ? 'critical' : 'medium',
        title: `Filing deadline in ${daysUntil} days`,
        message: `${cs.title} - ${cs.filingType || 'Filing'}`,
        caseId: cs._id,
        date: cs.filingDeadline
      });
    }
  });

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9));

  res.json({ success: true, data: alerts });
});

// POST /api/workflow/generate-notifications - Cron-style endpoint to generate notifications
exports.generateNotifications = asyncHandler(async (req, res) => {
  // Only admin can trigger
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only.' });
  }

  const now = new Date();
  let created = 0;

  // Get all active cases
  const activeCases = await Case.find({ status: 'Active' });
  
  for (const cs of activeCases) {
    if (!cs.nextHearingDate) continue;
    const hearingDate = new Date(cs.nextHearingDate);
    const daysUntil = Math.ceil((hearingDate - now) / 86400000);
    
    // Create notifications for hearings within 3 days
    if (daysUntil >= 0 && daysUntil <= 3 && cs.advocate) {
      const existing = await Notification.findOne({
        userId: cs.advocate,
        type: 'hearing',
        caseId: cs._id,
        createdAt: { $gte: new Date(now.getTime() - 86400000) }
      });
      if (!existing) {
        await Notification.create({
          userId: cs.advocate,
          type: 'hearing',
          title: `Hearing ${daysUntil === 0 ? 'TODAY' : `in ${daysUntil} day(s)`}: ${cs.title}`,
          message: `${cs.caseNumber} at ${cs.courtName}`,
          link: `/cases/${cs._id}`,
          caseId: cs._id
        });
        created++;
      }
    }
  }

  // Overdue invoices
  const overdueInvoices = await Invoice.find({ status: 'Overdue' });
  for (const inv of overdueInvoices) {
    if (inv.caseId) {
      const cs = await Case.findById(inv.caseId);
      if (cs && cs.advocate) {
        const existing = await Notification.findOne({
          userId: cs.advocate,
          type: 'invoice',
          caseId: cs._id,
          createdAt: { $gte: new Date(now.getTime() - 86400000 * 3) }
        });
        if (!existing) {
          await Notification.create({
            userId: cs.advocate,
            type: 'invoice',
            title: `Invoice ${inv.invoiceNumber} is overdue`,
            message: `${inv.clientName} - ₹${inv.total?.toLocaleString('en-IN')}`,
            link: `/billing`,
            caseId: cs._id
          });
          created++;
        }
      }
    }
  }

  res.json({ success: true, message: `Generated ${created} new notifications.` });
});
