/**
 * CLI UI Utilities - Professional console output formatting
 * Clean, professional interface without emojis
 */

const chalk = require('chalk');

const UI = {
    // Box drawing characters
    chars: {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        teeRight: '+',
        teeLeft: '+',
        teeDown: '+',
        teeUp: '+',
        cross: '+'
    },

    // Color schemes
    colors: {
        primary: chalk.cyan,
        success: chalk.green,
        error: chalk.red,
        warning: chalk.yellow,
        info: chalk.blue,
        muted: chalk.gray,
        highlight: chalk.white.bold,
        critical: chalk.red.bold,
        score: {
            excellent: chalk.green.bold,
            good: chalk.green,
            fair: chalk.yellow,
            poor: chalk.red,
            critical: chalk.red.bold
        }
    },

    /**
     * Print a horizontal line
     */
    line(width = 70, char = '-') {
        console.log(this.colors.muted(char.repeat(width)));
    },

    /**
     * Print a box header
     */
    boxHeader(title, width = 70) {
        const padding = Math.max(0, width - title.length - 4);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;

        console.log('');
        this.line(width);
        console.log(
            this.chars.vertical + ' ' +
            ' '.repeat(leftPad) +
            this.colors.highlight(title) +
            ' '.repeat(rightPad) +
            ' ' + this.chars.vertical
        );
        this.line(width);
    },

    /**
     * Print section header
     */
    section(title) {
        console.log('');
        console.log(this.colors.primary(`[${title}]`));
        this.line(50, '-');
    },

    /**
     * Print key-value pair
     */
    keyValue(key, value, indent = 2) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.muted(key + ':')} ${value}`);
    },

    /**
     * Print status with appropriate color
     */
    status(label, status, indent = 2) {
        const spaces = ' '.repeat(indent);
        let coloredStatus;

        switch (status.toUpperCase()) {
            case 'APPROVED':
            case 'PASSED':
            case 'OK':
            case 'SUCCESS':
                coloredStatus = this.colors.success(status);
                break;
            case 'REJECTED':
            case 'AUTO_REJECTED':
            case 'AGENT_REJECTION':
            case 'FAILED':
            case 'ERROR':
                coloredStatus = this.colors.error(status);
                break;
            case 'REVIEW_NEEDED':
            case 'WARNING':
            case 'PENDING':
                coloredStatus = this.colors.warning(status);
                break;
            default:
                coloredStatus = this.colors.info(status);
        }

        console.log(`${spaces}${this.colors.muted(label + ':')} ${coloredStatus}`);
    },

    /**
     * Print score with appropriate color
     */
    score(label, score, max = 100, indent = 2) {
        const spaces = ' '.repeat(indent);
        let colorFn;

        if (score >= 80) colorFn = this.colors.score.excellent;
        else if (score >= 70) colorFn = this.colors.score.good;
        else if (score >= 50) colorFn = this.colors.score.fair;
        else if (score >= 30) colorFn = this.colors.score.poor;
        else colorFn = this.colors.score.critical;

        console.log(`${spaces}${this.colors.muted(label + ':')} ${colorFn(score + '/' + max)}`);
    },

    /**
     * Print progress bar
     */
    progressBar(value, max = 100, width = 30, indent = 2) {
        const spaces = ' '.repeat(indent);
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;

        let color;
        if (percentage >= 80) color = this.colors.success;
        else if (percentage >= 60) color = this.colors.warning;
        else color = this.colors.error;

        const bar = color('[' + '#'.repeat(filled) + '-'.repeat(empty) + ']');
        console.log(`${spaces}${bar} ${percentage.toFixed(0)}%`);
    },

    /**
     * Print issue item
     */
    issue(severity, message, fix = null, line = null, indent = 2) {
        const spaces = ' '.repeat(indent);

        let severityColor;
        switch (severity.toUpperCase()) {
            case 'CRITICAL':
            case 'HIGH':
                severityColor = this.colors.error;
                break;
            case 'MEDIUM':
                severityColor = this.colors.warning;
                break;
            case 'LOW':
            case 'INFO':
                severityColor = this.colors.muted;
                break;
            default:
                severityColor = this.colors.info;
        }

        const lineInfo = line ? this.colors.muted(` (Line ${line})`) : '';
        console.log(`${spaces}${severityColor('[' + severity.toUpperCase() + ']')} ${message}${lineInfo}`);

        if (fix) {
            console.log(`${spaces}  ${this.colors.muted('Fix:')} ${fix}`);
        }
    },

    /**
     * Print agent result row
     */
    agentResult(name, score, confidence, indent = 2) {
        const spaces = ' '.repeat(indent);
        const scoreColor = score >= 70 ? this.colors.success :
            score >= 50 ? this.colors.warning : this.colors.error;

        console.log(
            `${spaces}${this.colors.info(name.padEnd(15))} ` +
            `${scoreColor((score + '/100').padEnd(8))} ` +
            `${this.colors.muted('(' + Math.round(confidence * 100) + '% confidence)')}`
        );
    },

    /**
     * Print list item
     */
    listItem(text, indent = 2, bullet = '-') {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.muted(bullet)} ${text}`);
    },

    /**
     * Print numbered list item
     */
    numberedItem(number, text, indent = 2) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.muted(number + '.')} ${text}`);
    },

    /**
     * Print success message
     */
    success(message, indent = 0) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.success('[OK]')} ${message}`);
    },

    /**
     * Print error message
     */
    error(message, indent = 0) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.error('[ERROR]')} ${message}`);
    },

    /**
     * Print warning message
     */
    warn(message, indent = 0) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.warning('[WARN]')} ${message}`);
    },

    /**
     * Print info message
     */
    info(message, indent = 0) {
        const spaces = ' '.repeat(indent);
        console.log(`${spaces}${this.colors.info('[INFO]')} ${message}`);
    },

    /**
     * Print blank line
     */
    blank() {
        console.log('');
    },

    /**
     * Print table row
     */
    tableRow(columns, widths, indent = 2) {
        const spaces = ' '.repeat(indent);
        const row = columns.map((col, i) => {
            const width = widths[i] || 15;
            return String(col).padEnd(width).substring(0, width);
        }).join(' ');
        console.log(spaces + row);
    },

    /**
     * Print table header
     */
    tableHeader(columns, widths, indent = 2) {
        this.tableRow(columns.map(c => this.colors.highlight(c)), widths, indent);
        const spaces = ' '.repeat(indent);
        const divider = widths.map(w => '-'.repeat(w)).join(' ');
        console.log(spaces + this.colors.muted(divider));
    },

    /**
     * Clear console
     */
    clear() {
        console.clear();
    },

    /**
     * Print banner
     */
    banner(title, subtitle = null) {
        console.log('');
        console.log(this.colors.primary('='.repeat(60)));
        console.log(this.colors.highlight('  ' + title));
        if (subtitle) {
            console.log(this.colors.muted('  ' + subtitle));
        }
        console.log(this.colors.primary('='.repeat(60)));
        console.log('');
    }
};

module.exports = { UI };
