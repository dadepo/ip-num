"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
var src_2 = require("../src");
var bigInt = require("big-integer");
describe('Pool', function () {
    describe('IPV4', function () {
        it('Should create from IP Numbers', function () {
            var pool = src_2.Pool
                .fromIPNumbers([src_1.IPv4.fromDecimalDottedString("10.0.0.1"), src_1.IPv4.fromDecimalDottedString("10.0.0.2")]);
            var ranges = pool.getRanges();
            expect(ranges[0].toCidrRange().toCidrString()).toEqual("10.0.0.1/32");
            expect(ranges[1].toCidrRange().toCidrString()).toEqual("10.0.0.2/32");
        });
        it('Should create from CIDR', function () {
            var pool = src_2.Pool
                .fromCidrRanges([src_1.IPv4CidrRange.fromCidr("192.168.178.0/24"), src_1.IPv4CidrRange.fromCidr("10.0.0.0/24")]);
            var ranges = pool.getRanges();
            expect(ranges[1].toCidrRange().toCidrString()).toBe("192.168.178.0/24");
            expect(ranges[0].toCidrRange().toCidrString()).toBe("10.0.0.0/24");
        });
        it('should fully aggregate', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("192.168.0.0-192.168.0.255");
            expect(aggregatedPool.getRanges().length).toEqual(1);
        });
        it('should aggregate with hole', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // arrays.push(Range.fromCidrRange(IPv4CidrRange.fromCidr("192.168.0.128/27"))); - hole
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            // 192.168.0.0/26 with 192.168.0.64/26
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("192.168.0.0-192.168.0.127");
            expect(aggregatedPool.getRanges()[1].toRangeString()).toEqual("192.168.0.160-192.168.0.191");
            expect(aggregatedPool.getRanges()[2].toRangeString()).toEqual("192.168.0.192-192.168.0.255");
            expect(aggregatedPool.getRanges().length).toEqual(3);
        });
        it('should aggregate with the whole space', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("0.0.0.0/0")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // arrays.push(Range.fromCidrRange(IPv4CidrRange.fromCidr("192.168.0.128/27"))); - hole
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("0.0.0.0-255.255.255.255");
            expect(aggregatedPool.getRanges().length).toEqual(1);
        });
        it("it should reset pool with given ranges", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges()[0].toRangeString()).toEqual("192.168.0.0-192.168.0.63");
            pool.resetWith(new Array(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27"))));
            expect(pool.getRanges()[0].toRangeString()).toEqual("192.168.0.160-192.168.0.191");
        });
        it("it should clear pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges()[0].toRangeString()).toEqual("192.168.0.0-192.168.0.63");
            pool.clear();
            expect(pool.getRanges().length).toEqual(0);
        });
        it("it should remove range from pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26"));
            arrays.push(rangeToRemove);
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(1);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
        });
        it("it should remove range from pool using removeOverlapping", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26"));
            arrays.push(rangeToRemove);
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(1);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
        });
        it("it should not remove range if not in the pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // not added to the pool
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.64/26");
        });
        it("it should not remove range if not in the pool using removeOverlapping", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // not added to the pool
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.64/26");
        });
        it("it should not remove range if range is sub range in the pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // not added to the pool
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.96/27"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.64/26");
        });
        it("it should remove range if range is sub range in the pool using removeOverlapping", function () {
            var arrays = new Array();
            // 192.168.0.0 - 192.168.0.63
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            // 192.168.0.64 - 192.168.0.127
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            // not added to the pool
            // 192.168.0.96 - 192.168.0.127
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.96/27"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.0/26");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.64/27");
        });
        it("it should return the size of pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getSize()).toEqual(bigInt(160));
        });
        it('it should get range by prefix', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var range = pool.getCidrRange(src_1.IPv4Prefix.fromNumber(26));
            expect(range.toCidrString()).toEqual("192.168.0.0/26");
            expect(pool.getRanges().length).toEqual(2);
        });
        it('it should through exception: pool big enough, but no range big enough for prefix', function () {
            var arrays = new Array();
            // 192.168.0.0 - 192.168.0.63 - 64
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            // 192.168.0.128 - 192.168.0.159 - 32
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            // 192.168.0.192 - 192.168.0.255 - 64
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(function () {
                pool.getCidrRange(src_1.IPv4Prefix.fromNumber(25)); //128
            }).toThrowError(Error, "No range big enough in the pool for requested prefix: 25");
        });
        it('it should get sub range by prefix', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var range = pool.getCidrRange(src_1.IPv4Prefix.fromNumber(28));
            expect(range.toCidrString()).toEqual("192.168.0.0/28");
            expect(pool.getRanges().length).toEqual(3);
            expect(pool.getRanges()[0].toRangeString()).toEqual("192.168.0.16-192.168.0.63");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.128/27");
            expect(pool.getRanges()[2].toCidrRange().toCidrString()).toEqual("192.168.0.192/26");
        });
        it('it should throw an exception if requested prefix is bigger than available', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/26")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.64/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(function () {
                pool.getCidrRange(src_1.IPv4Prefix.fromNumber(24));
            }).toThrowError(Error, "Not enough IP number in the pool for requested prefix: 24");
        });
        it("should get a single prefix when asking multiple prefixes", function () {
            var arrays = new Array();
            // 192.168.0.128 - 192.168.0.159 - 32
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            // // 192.168.0.160 - 192.168.0.191 - 32
            // arrays.push(RangedSet.fromCidrRange(IPv4CidrRange.fromCidr("192.168.0.160/27")));
            // 192.168.0.192 - 192.168.0.255 - 32
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/26")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var cidrRanges = pool.getCidrRanges(src_1.IPv4Prefix.fromNumber(26));
            expect(cidrRanges[0].toCidrString()).toEqual("192.168.0.192/26");
            expect(pool.getRanges().length).toEqual(1);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.128/27");
        });
        it("should get a multiple prefix that adds up to requested prefix", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/27")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(4);
            var cidrRanges = pool.getCidrRanges(src_1.IPv4Prefix.fromNumber(26));
            expect(cidrRanges[0].toCidrString()).toEqual("192.168.0.0/27");
            expect(cidrRanges[1].toCidrString()).toEqual("192.168.0.128/27");
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.160/27");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.192/27");
        });
        it("should get a sorted multiple prefix that adds up to requested prefix", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.0/27"))); // pick this and
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.160/27")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.128/27"))); // this
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv4CidrRange.fromCidr("192.168.0.192/27")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(4);
            var cidrRanges = pool.getCidrRanges(src_1.IPv4Prefix.fromNumber(26));
            expect(cidrRanges[0].toCidrString()).toEqual("192.168.0.0/27");
            expect(cidrRanges[1].toCidrString()).toEqual("192.168.0.128/27");
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("192.168.0.160/27");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("192.168.0.192/27");
        });
    });
    describe("IPv6", function () {
        it('Should create from IP Numbers', function () {
            var pool = src_2.Pool
                .fromIPNumbers([src_1.IPv6.fromHexadecimalString("2620:0:0:0:0:0:0:0"),
                src_1.IPv6.fromHexadecimalString("2620:0:ffff:ffff:ffff:ffff:ffff:ffff")]);
            var ranges = pool.getRanges();
            expect(ranges[0].toCidrRange().toCidrString()).toEqual("2620:0:0:0:0:0:0:0/128");
            expect(ranges[1].toCidrRange().toCidrString()).toEqual("2620:0:ffff:ffff:ffff:ffff:ffff:ffff/128");
        });
        it('Should create from CIDR', function () {
            var pool = src_2.Pool
                .fromCidrRanges([
                src_1.IPv6CidrRange.fromCidr("2620:0:0:0:0:0:0:0/128"),
                src_1.IPv6CidrRange.fromCidr("2620:0:ffff:ffff:ffff:ffff:ffff:ffff/128")
            ]);
            var ranges = pool.getRanges();
            expect(ranges[0].toCidrRange().toCidrString()).toBe("2620:0:0:0:0:0:0:0/128");
            expect(ranges[1].toCidrRange().toCidrString()).toBe("2620:0:ffff:ffff:ffff:ffff:ffff:ffff/128");
        });
        it("it should fully aggregate", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("2001:db8:0:0:0:0:0:0-2001:db8:1:ffff:ffff:ffff:ffff:ffff");
            expect(aggregatedPool.getRanges().length).toEqual(1);
        });
        it('should aggregate with hole', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            // arrays.push(Range.fromCidrRange(IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50"))); - hole
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("2001:db8:0:0:0:0:0:0-2001:db8:0:ffff:ffff:ffff:ffff:ffff");
            expect(aggregatedPool.getRanges()[1].toRangeString()).toEqual("2001:db8:1:4000:0:0:0:0-2001:db8:1:7fff:ffff:ffff:ffff:ffff");
            expect(aggregatedPool.getRanges()[2].toRangeString()).toEqual("2001:db8:1:8000:0:0:0:0-2001:db8:1:ffff:ffff:ffff:ffff:ffff");
            expect(aggregatedPool.getRanges().length).toEqual(3);
        });
        it('should aggregate with the whole space', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("::0/0")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            // arrays.push(Range.fromCidrRange(IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50"))); - hole
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var aggregatedPool = pool.aggregate();
            expect(aggregatedPool.getRanges()[0].toRangeString()).toEqual("::0-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff");
            expect(aggregatedPool.getRanges().length).toEqual(1);
        });
        it("it should reset pool with given ranges", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges()[0].toRangeString()).toEqual("2001:db8:0:0:0:0:0:0-2001:db8:0:ffff:ffff:ffff:ffff:ffff");
            pool.resetWith(new Array(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50"))));
            expect(pool.getRanges()[0].toRangeString()).toEqual("2001:db8:1:4000:0:0:0:0-2001:db8:1:7fff:ffff:ffff:ffff:ffff");
        });
        it("it should clear pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges()[0].toRangeString()).toEqual("2001:db8:0:0:0:0:0:0-2001:db8:0:ffff:ffff:ffff:ffff:ffff");
            pool.clear();
            expect(pool.getRanges().length).toEqual(0);
        });
        it("it should remove range from pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50"));
            arrays.push(rangeToRemove);
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(1);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/48");
        });
        it("it should remove range from pool using removeOverlapping", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50"));
            arrays.push(rangeToRemove);
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(1);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/48");
        });
        it("it should not remove range if not in the pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            // not added to the pool
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/48");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2001:db8:1:0:0:0:0:0/50");
        });
        it("it should not remove range if not in the pool using removeOverlapping", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            // not added to the pool
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/48");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2001:db8:1:0:0:0:0:0/50");
        });
        it("it should not remove range if range is sub range in the pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            // sub range of 2001:db8:1:0:0:0:0:0/50
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/51"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeExact(rangeToRemove);
            expect(isRemoved).toBeFalse();
            expect(pool.getRanges().length).toEqual(2);
        });
        it("it should remove range if range is sub range in the pool using removeOverlapping", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            // sub range of 2001:db8:1:0:0:0:0:0/50
            var rangeToRemove = src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/51"));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(2);
            var isRemoved = pool.removeOverlapping(rangeToRemove);
            expect(isRemoved).toBeTrue();
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/48");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2001:db8:1:2000:0:0:0:0/51");
        });
        it("it should return the size of pool", function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/127")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/128")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getSize()).toEqual(bigInt(3));
        });
        it('it should get range by prefix', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/127")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/128")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var range = pool.getCidrRange(src_1.IPv6Prefix.fromNumber(127));
            expect(range.toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/127");
            expect(pool.getRanges().length).toEqual(1);
        });
        it('it should through exception: pool big enough, but no range big enough for prefix', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2002:db8:1:8000:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(function () {
                pool.getCidrRange(src_1.IPv6Prefix.fromNumber(48));
            }).toThrowError(Error, "No range big enough in the pool for requested prefix: 48");
        });
        it('it should get sub range by prefix', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:4000:0:0:0:0/50")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:8000:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            var range = pool.getCidrRange(src_1.IPv6Prefix.fromNumber(50));
            expect(range.toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/50");
            expect(pool.getRanges().length).toEqual(4);
            expect(pool.getRanges()[0].toRangeString()).toEqual("2001:db8:0:4000:0:0:0:0-2001:db8:0:ffff:ffff:ffff:ffff:ffff");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2001:db8:1:4000:0:0:0:0/50");
            expect(pool.getRanges()[2].toCidrRange().toCidrString()).toEqual("2001:db8:1:8000:0:0:0:0/49");
            expect(pool.getRanges()[3].toCidrRange().toCidrString()).toEqual("2001:db8:1:8000:0:0:0:0/49");
        });
        it('it should throw an exception if requested prefix is bigger than available', function () {
            var arrays = new Array();
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/48")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/50")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(function () {
                pool.getCidrRange(src_1.IPv6Prefix.fromNumber(47));
            }).toThrowError(Error, "Not enough IP number in the pool for requested prefix: 47");
        });
        it("should get a multiple prefix that adds up to requested prefix", function () {
            var arrays = new Array();
            // 2001:db8:0:0:0:0:0:0 - 2001:db8:0:7fff:ffff:ffff:ffff:ffff
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/49")));
            // 2001:db8:1:0:0:0:0:0 - 2001:db8:1:7fff:ffff:ffff:ffff:ffff
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/49")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2002:db8:0:0:0:0:0:0/49")));
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2002:db8:1:0:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(4);
            var cidrRanges = pool.getCidrRanges(src_1.IPv6Prefix.fromNumber(48));
            expect(cidrRanges[0].toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/49");
            expect(cidrRanges[1].toCidrString()).toEqual("2001:db8:1:0:0:0:0:0/49");
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2002:db8:0:0:0:0:0:0/49");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2002:db8:1:0:0:0:0:0/49");
        });
        it("should get a sorted multiple prefix that adds up to requested prefix", function () {
            var arrays = new Array();
            // 2001:db8:0:0:0:0:0:0 - 2001:db8:0:7fff:ffff:ffff:ffff:ffff
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:0:0:0:0:0:0/49"))); // pick this
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2002:db8:0:0:0:0:0:0/49")));
            // 2001:db8:1:0:0:0:0:0 - 2001:db8:1:7fff:ffff:ffff:ffff:ffff
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2001:db8:1:0:0:0:0:0/49"))); // and this
            arrays.push(src_1.RangedSet.fromCidrRange(src_1.IPv6CidrRange.fromCidr("2002:db8:1:0:0:0:0:0/49")));
            var pool = src_2.Pool.fromRangeSet(arrays);
            expect(pool.getRanges().length).toEqual(4);
            var cidrRanges = pool.getCidrRanges(src_1.IPv6Prefix.fromNumber(48));
            expect(cidrRanges[0].toCidrString()).toEqual("2001:db8:0:0:0:0:0:0/49");
            expect(cidrRanges[1].toCidrString()).toEqual("2001:db8:1:0:0:0:0:0/49");
            expect(pool.getRanges().length).toEqual(2);
            expect(pool.getRanges()[0].toCidrRange().toCidrString()).toEqual("2002:db8:0:0:0:0:0:0/49");
            expect(pool.getRanges()[1].toCidrRange().toCidrString()).toEqual("2002:db8:1:0:0:0:0:0/49");
        });
    });
});
//# sourceMappingURL=PoolTest.js.map