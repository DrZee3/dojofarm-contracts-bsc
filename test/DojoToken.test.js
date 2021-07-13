const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const DojoToken = artifacts.require('DojoToken');

contract('DojoToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.dojo = await DojoToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.dojo.owner()), owner);
        assert.equal((await this.dojo.operator()), owner);

        await expectRevert(this.dojo.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.updateDojoSwapRouter({ from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.dojo.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.dojo.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await expectRevert(this.dojo.transferOperator(this.zeroAddress, { from: operator }), 'DOJO::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        assert.equal((await this.dojo.transferTaxRate()).toString(), '500');
        assert.equal((await this.dojo.burnRate()).toString(), '20');

        await this.dojo.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.dojo.transferTaxRate()).toString(), '0');
        await this.dojo.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.dojo.transferTaxRate()).toString(), '1000');
        await expectRevert(this.dojo.updateTransferTaxRate(1001, { from: operator }), 'DOJO::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.dojo.updateBurnRate(0, { from: operator });
        assert.equal((await this.dojo.burnRate()).toString(), '0');
        await this.dojo.updateBurnRate(100, { from: operator });
        assert.equal((await this.dojo.burnRate()).toString(), '100');
        await expectRevert(this.dojo.updateBurnRate(101, { from: operator }), 'DOJO::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await this.dojo.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');

        await this.dojo.transfer(bob, 12345, { from: alice });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.dojo.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '494');

        await this.dojo.approve(carol, 22345, { from: alice });
        await this.dojo.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.dojo.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await this.dojo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');

        await this.dojo.transfer(bob, 19, { from: alice });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.dojo.balanceOf(bob)).toString(), '19');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        assert.equal((await this.dojo.transferTaxRate()).toString(), '500');
        assert.equal((await this.dojo.burnRate()).toString(), '20');

        await this.dojo.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.dojo.transferTaxRate()).toString(), '0');

        await this.dojo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');

        await this.dojo.transfer(bob, 10000, { from: alice });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.dojo.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        assert.equal((await this.dojo.transferTaxRate()).toString(), '500');
        assert.equal((await this.dojo.burnRate()).toString(), '20');

        await this.dojo.updateBurnRate(0, { from: operator });
        assert.equal((await this.dojo.burnRate()).toString(), '0');

        await this.dojo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');

        await this.dojo.transfer(bob, 1234, { from: alice });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.dojo.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        assert.equal((await this.dojo.transferTaxRate()).toString(), '500');
        assert.equal((await this.dojo.burnRate()).toString(), '20');

        await this.dojo.updateBurnRate(100, { from: operator });
        assert.equal((await this.dojo.burnRate()).toString(), '100');

        await this.dojo.mint(alice, 10000000, { from: owner });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');

        await this.dojo.transfer(bob, 1234, { from: alice });
        assert.equal((await this.dojo.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.dojo.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.dojo.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.dojo.balanceOf(this.dojo.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.dojo.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.dojo.maxTransferAmount()).toString(), '0');

        await this.dojo.mint(alice, 1000000, { from: owner });
        assert.equal((await this.dojo.maxTransferAmount()).toString(), '5000');

        await this.dojo.mint(alice, 1000, { from: owner });
        assert.equal((await this.dojo.maxTransferAmount()).toString(), '5005');

        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await this.dojo.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.dojo.maxTransferAmount()).toString(), '10010');

        await expectRevert(this.dojo.updateMaxTransferAmountRate(49, { from: operator }),
            'DOJO::updateMaxTransferAmountRate: Max transfer amount rate should be higher than 50 (0.5%).');

        await expectRevert(this.dojo.updateMaxTransferAmountRate(10001, { from: operator }),
            'DOJO::updateMaxTransferAmountRate: Max transfer amount rate must not exceed the maximum rate.');

    });


    it('anti whale', async () => {
        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        assert.equal((await this.dojo.isExcludedFromAntiWhale(operator)), false);
        await this.dojo.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.dojo.isExcludedFromAntiWhale(operator)), true);

        await this.dojo.mint(alice, 10000, { from: owner });
        await this.dojo.mint(bob, 10000, { from: owner });
        await this.dojo.mint(carol, 10000, { from: owner });
        await this.dojo.mint(operator, 10000, { from: owner });
        await this.dojo.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.dojo.maxTransferAmount()).toString(), '250');
        await expectRevert(this.dojo.transfer(bob, 1001, { from: alice }), 'DOJO::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.dojo.approve(carol, 1001, { from: alice });
        await expectRevert(this.dojo.transferFrom(alice, carol, 1001, { from: carol }), 'DOJO::antiWhale: Transfer amount exceeds the maxTransferAmount');


        //
        await this.dojo.transfer(bob, 250, { from: alice });
        await this.dojo.transferFrom(alice, carol, 250, { from: carol });

        await this.dojo.transfer(this.burnAddress, 251, { from: alice });
        await this.dojo.transfer(operator, 251, { from: alice });
        await this.dojo.transfer(owner, 251, { from: alice });
        await this.dojo.transfer(this.dojo.address, 251, { from: alice });

        await this.dojo.transfer(alice, 251, { from: operator });
        await this.dojo.transfer(alice, 251, { from: owner });
        await this.dojo.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.dojo.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.dojo.swapAndLiquifyEnabled()), false);

        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await this.dojo.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.dojo.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.dojo.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.dojo.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.dojo.transferOperator(operator, { from: owner });
        assert.equal((await this.dojo.operator()), operator);

        await this.dojo.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.dojo.minAmountToLiquify()).toString(), '100');
    });
});
