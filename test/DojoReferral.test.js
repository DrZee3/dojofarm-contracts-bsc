const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const DojoReferral = artifacts.require('DojoReferral');

contract('DojoReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.dojoReferral = await DojoReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.dojoReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.dojoReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.dojoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), true);

        await this.dojoReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.dojoReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), false);
        await this.dojoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), true);

        await this.dojoReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.dojoReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.dojoReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.dojoReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.dojoReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.dojoReferral.referralsCount(referrer)).valueOf(), '0');

        await this.dojoReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.dojoReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.dojoReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.dojoReferral.referralsCount(bob)).valueOf(), '0');
        await this.dojoReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.dojoReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.dojoReferral.getReferrer(alice)).valueOf(), referrer);

        await this.dojoReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.dojoReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.dojoReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.dojoReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.dojoReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.dojoReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.dojoReferral.operators(operator)).valueOf(), true);

        await this.dojoReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.dojoReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.dojoReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.dojoReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.dojoReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.dojoReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.dojoReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.dojoReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
