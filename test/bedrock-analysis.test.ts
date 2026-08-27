import { CategorySummary, Transaction } from '../lambda/shared/types';

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
    const mockSend = jest.fn();
    return {
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
        ConverseCommand: jest.fn().mockImplementation((input) => ({ input })),
        __mockSend: mockSend,
    };
});

import { generateQuickAnalysis } from '../lambda/shared/bedrock-analysis';
const { __mockSend: mockSend } = jest.requireMock('@aws-sdk/client-bedrock-runtime') as { __mockSend: jest.Mock };

function encodeResponse(text: string) {
    return { output: { message: { role: 'assistant', content: [{ text }] } } };
}

function summary(overrides: Partial<CategorySummary>): CategorySummary {
    return {
        category: 'Office',
        totalSpend: 100,
        transactionCount: 1,
        uniqueEmployeeCount: 1,
        transactions: [],
        ...overrides,
    };
}

function txn(overrides: Partial<Transaction>): Transaction {
    return {
        transactionDate: '2026-08-01',
        employeeId: 'emp-1',
        merchantName: 'Shop',
        mcc: '1111',
        amountCents: 0,
        ...overrides,
    };
}

describe('generateQuickAnalysis', () => {
    beforeEach(() => mockSend.mockReset());

    test('returns undefined without calling Bedrock when no category has a savings rate', async () => {
        const result = await generateQuickAnalysis([summary({ category: 'Amazon + Prime Spend' })]);
        expect(result).toBeUndefined();
        expect(mockSend).not.toHaveBeenCalled();
    });

    test('skips categories with zero spend', async () => {
        const result = await generateQuickAnalysis([summary({ category: 'Office', totalSpend: 0 })]);
        expect(result).toBeUndefined();
        expect(mockSend).not.toHaveBeenCalled();
    });

    test('computes dollar savings from the category rate and includes them in the prompt', async () => {
        mockSend.mockResolvedValue(encodeResponse('Great pitch here.'));
        const result = await generateQuickAnalysis([summary({ category: 'Office', totalSpend: 200 })]);

        expect(result).toBe('Great pitch here.');
        const [[command]] = mockSend.mock.calls;
        const promptText = command.input.messages[0].content[0].text;
        expect(promptText).toContain('Office');
        expect(promptText).toContain('18.00'); // 200 * 0.09
    });

    test('derives top merchants per category from the stored transactions', async () => {
        mockSend.mockResolvedValue(encodeResponse('pitch'));
        const transactions = [
            txn({ merchantName: 'Staples', amountCents: 5000 }),
            txn({ merchantName: 'Quill', amountCents: 1000 }),
        ];
        await generateQuickAnalysis([summary({ category: 'Office', totalSpend: 60, transactions })]);

        const [[command]] = mockSend.mock.calls;
        const promptText = command.input.messages[0].content[0].text;
        expect(promptText).toContain('Staples');
        expect(promptText).toContain('Quill');
    });

    test('fails soft and returns undefined when Bedrock throws', async () => {
        mockSend.mockRejectedValue(new Error('boom'));
        const result = await generateQuickAnalysis([summary({ category: 'Office', totalSpend: 100 })]);
        expect(result).toBeUndefined();
    });

    test('fails soft and returns undefined on an empty model response', async () => {
        mockSend.mockResolvedValue(encodeResponse('   '));
        const result = await generateQuickAnalysis([summary({ category: 'Office', totalSpend: 100 })]);
        expect(result).toBeUndefined();
    });
});
