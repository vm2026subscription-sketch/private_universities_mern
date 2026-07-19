#!/usr/bin/env node
/**
 * Guarded role-assignment CLI.
 *
 * This replaces the removed `ensureAdminRole()` behaviour, which silently
 * promoted any account whose email matched a hardcoded constant every time it
 * logged in. Privilege assignment is now an explicit, audited, out-of-band
 * operation performed by an operator with database credentials.
 *
 * Usage:
 *   node scripts/grantRole.js --email someone@example.com --role admin
 *   node scripts/grantRole.js --email someone@example.com --role admin --confirm
 *   node scripts/grantRole.js --list
 *
 * Safety: running this file with no arguments performs a DRY RUN and prints
 * usage. Nothing is written unless BOTH --email/--role are supplied AND
 * --confirm is passed.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const VALID_ROLES = ['user', 'admin', 'superadmin'];

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
};

const usage = () => {
  console.log(`
Grant or revoke a role for an existing user.

  --email <address>   Target account (must already exist)
  --role  <role>      One of: ${VALID_ROLES.join(', ')}
  --confirm           Actually write the change (omit for a dry run)
  --list              Show all accounts holding admin or superadmin

Examples:
  node scripts/grantRole.js --list
  node scripts/grantRole.js --email ops@example.com --role admin
  node scripts/grantRole.js --email ops@example.com --role admin --confirm

Nothing is modified unless --confirm is present.
`);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (Object.keys(args).length === 0) {
    usage();
    console.log('No arguments supplied — nothing to do. Exiting without connecting to the database.\n');
    process.exit(0);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const User = require('../src/models/User');

  try {
    if (args.list) {
      const privileged = await User.find({ role: { $in: ['admin', 'superadmin'] } })
        .select('name email role status lastLogin')
        .sort({ role: -1, email: 1 })
        .lean();

      if (privileged.length === 0) {
        console.log('\nNo privileged accounts exist.\n');
      } else {
        console.log(`\nPrivileged accounts (${privileged.length}):\n`);
        privileged.forEach((user) => {
          console.log(`  [${user.role.padEnd(10)}] ${user.email}  (${user.status})  last login: ${user.lastLogin || 'never'}`);
        });
        console.log('');
      }
      return;
    }

    const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : null;
    const role = typeof args.role === 'string' ? args.role.trim() : null;

    if (!email || !role) {
      usage();
      console.error('Both --email and --role are required.\n');
      process.exitCode = 1;
      return;
    }

    if (!VALID_ROLES.includes(role)) {
      console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Deliberately does NOT create the account. Privilege is only ever granted
      // to a user who already registered and verified through the normal flow.
      console.error(`No account found for ${email}. Register through the app first, then re-run this script.`);
      process.exitCode = 1;
      return;
    }

    if (user.role === role) {
      console.log(`${email} already has role "${role}". No change needed.`);
      return;
    }

    if (user.role === 'superadmin' && role !== 'superadmin') {
      const remaining = await User.countDocuments({ role: 'superadmin', _id: { $ne: user._id } });
      if (remaining === 0) {
        console.error('Refusing to demote the last remaining superadmin.');
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\n  ${email}`);
    console.log(`  role:     ${user.role}  ->  ${role}`);
    console.log(`  verified: ${user.isEmailVerified}`);
    console.log(`  status:   ${user.status}`);

    if (!args.confirm) {
      console.log('\nDRY RUN — no changes written. Re-run with --confirm to apply.\n');
      return;
    }

    const previousRole = user.role;

    user.role = role;
    // Revoke outstanding tokens so the new privilege level takes effect on the
    // user's next request rather than at token expiry.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const Session = require('../src/models/Session');
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedReason: 'privilege_change' }
    );

    const AuditLog = require('../src/models/AuditLog');
    await AuditLog.create({
      // No authenticated actor exists for a CLI run, so the record is attributed
      // to the affected account and the description names the channel.
      userId: user._id,
      action: 'role_change',
      resource: 'user',
      resourceId: user._id,
      description: `Role changed ${previousRole} -> ${role} via grantRole CLI (operator with database access)`,
      changes: { before: { role: previousRole }, after: { role } },
    });

    console.log(`\nDone. ${email} now has role "${role}". Existing sessions revoked.\n`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('grantRole failed:', error.message);
  process.exit(1);
});
