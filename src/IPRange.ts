import * as bigInt from "big-integer";
import {IPv6, isIPv4} from "./IPNumber";
import {IPv4} from "./IPNumber";
import {IPv6Prefix} from "./Prefix";
import {intLog2, leftPadWithZeroBit} from "./BinaryUtils";
import {parseBinaryStringToBigInteger} from "./BinaryUtils";
import {Validator} from "./Validator";
import {IPv4Prefix} from "./Prefix";


/**
 * Represents a continuous segment of either IPv4 or IPv6 numbers
 * without adhering to classless inter-domain routing scheme
 * for allocating IP addresses.
 */
export class RangedSet<T extends IPv4 | IPv6> implements Iterable<IPv4 | IPv6> {
    readonly bitValue: bigInt.BigInteger;
    private readonly currentValue: IPv4 | IPv6;

    /**
     * Convenience method for constructing an instance of {@link RangedSet} from a
     * single IP number.
     *
     * @param ip The IP number, either IPv4 or IPv6 to construct the range from.
     */
    static fromSingleIP(ip: IPv4 | IPv6) {
        return new RangedSet(ip, ip);

    }
    /**
     * Convenience method for constructing an instance of {@link RangedSet} from an
     * instance of either {@link IPv4CidrRange} or {@link IPv6CidrRange}
     *
     * @param cidrRange an instance of {@link RangedSet}
     */
    static fromCidrRange(cidrRange: IPv6CidrRange | IPv4CidrRange) {
        return new RangedSet(cidrRange.getFirst(), cidrRange.getLast());
    }

    /**
     * Constructor for an instance of {@link RangedSet} from an
     * instance of either {@link IPv4CidrRange} or {@link IPv6CidrRange}
     *
     * Throws an exception if first IP number is not less than given last IP number
     *
     * @param first the first IP number of the range
     * @param last the last IP number of the range
     */
    constructor(private first: T, private last: T) {
        if (first.isGreaterThan(last)) {
             throw new Error(`${first.toString()} should be lower than ${last.toString()}`)
        }
        this.currentValue = first;
        this.bitValue = bigInt(first.bitSize);
    }

    /**
     * Returns the first IP number in the range
     */
    getFirst(): T {
        return this.first;
    }

    /**
     * Returns the last IP number in the range
     */
    getLast(): T {
        return this.last;
    }

    /**
     * Returns the size, which is the number of IP numbers in the range.
     */
    getSize(): bigInt.BigInteger {
        return this.last.getValue().minus(this.first.getValue()).plus(bigInt.one);
    }

    /**
     * Converts to a string representation of the range in the form of:
     * <first-ip>-<last-ip>
     */
    toRangeString(): string {
        return `${this.getFirst()}-${this.getLast()}`
    }

    /**
     * Checks if this range is inside another range.
     *
     * @param otherRange the other range to check if this range is inside of.
     */
    public inside(otherRange: RangedSet<T>): boolean {
        let thisFirst: IPv6 | IPv4 = this.getFirst();
        let thisLast: IPv6 | IPv4 = this.getLast();
        let otherFirst: IPv6 | IPv4 = otherRange.getFirst();
        let otherLast: IPv6 | IPv4 = otherRange.getLast();

        return (otherFirst.isLessThanOrEquals(thisFirst) && otherLast.isGreaterThanOrEquals(thisLast));
    }

    /**
     * Checks if this range contains the given other range.
     *
     * @param otherRange the other range to check if this range contains
     */
    public contains(otherRange: RangedSet<T>): boolean {
        let thisFirst: IPv6 | IPv4 = this.getFirst();
        let thisLast: IPv6 | IPv4 = this.getLast();
        let otherFirst: IPv6 | IPv4 = otherRange.getFirst();
        let otherLast: IPv6 | IPv4 = otherRange.getLast();

        return (thisFirst.isLessThanOrEquals(otherFirst) && thisLast.isGreaterThanOrEquals(otherLast));
    }

    /**
     * Check if this range is equal to the given other range.
     *
     * @param otherRange the other range to check if equal to this range.
     */
    public isEquals(otherRange: RangedSet<T>): boolean {
        return this.getFirst().isEquals(otherRange.getFirst())
            && this.getLast().isEquals(otherRange.getLast());
    };

    /**
     * Check if this range is less than the given range.
     *
     * @param otherRange the other range to check if less than.
     */
    public isLessThan(otherRange: RangedSet<T>): boolean {
        if (this.isEquals(otherRange)) {
            return false;
        } else {
            if (this.getFirst().isEquals(otherRange.getFirst())) {
                return this.getSize().lesser(otherRange.getSize())
            }
            return this.getFirst().isLessThan(otherRange.getFirst());
        }
    }

    /**
     * Check if this range is greater than the given range.
     *
     * @param otherRange the other range to check if greater than.
     */
    public isGreaterThan(otherRange: RangedSet<T>): boolean {
        if (this.isEquals(otherRange)) {
            return false;
        } else {
            if (this.getFirst().isEquals(otherRange.getFirst())) {
                return this.getSize().greater(otherRange.getSize());
            }
            return this.getFirst().isGreaterThan(otherRange.getFirst());
        }
    }

    /**
     * Checks of this range overlaps with a given other range.
     *
     * This means it checks if part of a range is part of another range without
     * being totally contained in the other range. Hence Equal or ranges contained inside one
     * another are not considered as overlapping.
     *
     * @param otherRange the other range to check if it overlaps with this range.
     */
    public isOverlapping(otherRange: RangedSet<T>): boolean {
        let thisFirst: IPv6 | IPv4 = this.getFirst();
        let thisLast: IPv6 | IPv4 = this.getLast();
        let otherFirst: IPv6 | IPv4 = otherRange.getFirst();
        let otherLast: IPv6 | IPv4 = otherRange.getLast();

        return (
            thisLast.isGreaterThan(otherFirst) && thisLast.isLessThanOrEquals(otherLast) && thisFirst.isLessThan(otherFirst)
            ||
            otherLast.isGreaterThan(thisFirst) && otherLast.isLessThanOrEquals(thisLast) && otherFirst.isLessThan(thisFirst)
        );
    }

    /**
     * Check if this range can be converted to a CIDR range.
     */
    public isCidrAble(): boolean {
        try {
            intLog2(this.getSize());
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Converts an instance of range to an instance of CIDR range
     */
    public toCidrRange(): IPv4CidrRange | IPv6CidrRange {
        if (isIPv4(this.currentValue)) {
            return this.toIPv4CidrRange();
        } else {
            return this.toIPv6CidrRange();
        }
    };

    /**
     * Checks if this range is consecutive with another range.
     *
     * This means if the two ranges can be placed side by side, without any gap. Hence Equal
     * or ranges contained inside one another, or overlapping ranges are not considered as consecutive.
     *
     * @param otherRange the other range to check if this range is consecutive to.
     */
    public isConsecutive(otherRange: RangedSet<T>): boolean {
        let thisFirst: IPv6 | IPv4 = this.getFirst();
        let thisLast: IPv6 | IPv4 = this.getLast();
        let otherFirst: IPv6 | IPv4 = otherRange.getFirst();
        let otherLast: IPv6 | IPv4 = otherRange.getLast();

        return (
            thisLast.hasNext() && thisLast.nextIPNumber().isEquals(otherFirst)
            ||
            otherLast.hasNext() && otherLast.nextIPNumber().isEquals(thisFirst)
        )
    }

    /**
     * Creates a range that is a union of this range and the given other range.
     *
     * @param otherRange the other range to combine with this range
     */
    public union(otherRange: RangedSet<T>): RangedSet<T> {
        if (this.isEquals(otherRange)) {
            return otherRange;
        }

        if (this.isOverlapping(otherRange)) {
            if (this.getFirst().isLessThan(otherRange.getFirst())) {
                return new RangedSet(this.getFirst(), otherRange.getLast());
            } else {
                return new RangedSet(otherRange.getFirst(), this.getLast());
            }
        }

        if (this.contains(otherRange)) {
            return this;
        } else if(otherRange.contains(this)) {
            return otherRange;
        }

        throw new Error("Ranges do not overlap nor are equal")
    }


    public subtract(otherRange: RangedSet<T>): RangedSet<T> {
        if (!this.isOverlapping(otherRange)) {
            throw new Error("Cannot subtract ranges that are not overlapping")
        }
        if (!this.isLessThan(otherRange)) {
            throw new Error("Cannot subtract a larger range from this range")
        }
        return new RangedSet(this.getFirst(), otherRange.getLast());
    }

    /**
     * Returns a sub range of a given size from this range.
     *
     * @param offset offset from this range where the subrange should begin
     * @param size the size of the range
     */
    public takeSubRange(offset: bigInt.BigInteger, size: bigInt.BigInteger): RangedSet<IPv4 | IPv6> {
        if (offset.plus(size).gt(this.getSize())) {
            throw new Error("Requested range is greater than what can be taken");
        }

        if (size.eq(bigInt(0))) {
            throw new Error("Sub range cannot be zero");
        }

        let valueOfFirstIp = this.getFirst().value.plus(offset);
        let firstIp: IPv4 | IPv6 = isIPv4(this.getFirst()) ?
            IPv4.fromBigInteger(valueOfFirstIp) : IPv6.fromBigInteger(valueOfFirstIp);

        let valueOfLastIp = firstIp.value.plus(size.minus(bigInt.one));
        let lastIp = isIPv4(firstIp)? IPv4.fromBigInteger(valueOfLastIp) : IPv6.fromBigInteger(valueOfLastIp);

        return new RangedSet(firstIp, lastIp);
    }

    public difference(range: RangedSet<T>): Array<RangedSet<IPv4 | IPv6>> {
        if (range.getSize().gt(this.getSize())) {
            throw new Error("Range is greater than range to be subtracted from");
        }

        if (!this.contains(range)) {
            throw new Error("Range to subtract is not contained in this range");
        }

        let reminders = [];
        try {
            reminders.push(new RangedSet(this.getFirst(), range.getFirst().previousIPNumber()));
        } catch (e) {}

        try {
            reminders.push(new RangedSet(range.getLast().nextIPNumber(), this.getLast()));
        } catch (e) {}

        return reminders;
    }

    public *take(count?: number): Iterable<IPv4 | IPv6> {
        let computed: IPv6 | IPv4 = this.getFirst();
        let returnCount = count === undefined ? this.getSize().valueOf() : count;
        while(returnCount > 0) {
            returnCount--;
            yield computed;
            computed = computed.nextIPNumber();
        }
    }

    *[Symbol.iterator](): IterableIterator<IPv4 | IPv6> {
        yield* this.take()
    }

    private toIPv4CidrRange(): IPv4CidrRange {
        let candidateRange = new IPv4CidrRange(this.getFirst() as IPv4, IPv4Prefix.fromRangeSize(this.getSize()));
        if (candidateRange.getFirst().isEquals(this.getFirst())) {
            return candidateRange;
        } else {
            throw new Error("Range cannot be converted to CIDR")
        }

    }

    private toIPv6CidrRange(): IPv6CidrRange {
        let candidateRange = new IPv6CidrRange(this.getFirst() as IPv6, IPv6Prefix.fromRangeSize(this.getSize()));
        if (candidateRange.getFirst().isEquals(this.getFirst())) {
            return candidateRange;
        } else {
            throw new Error("Range cannot be converted to CIDR")
        }
    }
}

/**
 * Provides the implementation of functionality that are common to {@link IPv4CidrRange} and {@link IPv6CidrRange}
 */

export abstract class AbstractIPRange<T extends IPv4 | IPv6, P extends IPv4Prefix | IPv6Prefix>  implements Iterable<IPv4 | IPv6> {

    abstract readonly bitValue: bigInt.BigInteger;
    protected abstract newInstance(num:T, prefix: IPv4Prefix | IPv6Prefix) : IPv4CidrRange | IPv6CidrRange;
    abstract getFirst(): T
    abstract getLast(): T
    abstract getPrefix():P;
    abstract getSize(): bigInt.BigInteger;
    abstract toCidrString(): string | never

    public hasNextRange(): boolean {
        let sizeOfCurrentRange = this.getSize();
        return bigInt(2).pow(this.bitValue)
            .minus(sizeOfCurrentRange)
            .greaterOrEquals(this.getFirst().getValue().plus(sizeOfCurrentRange));
    }

    public hasPreviousRange(): boolean {
        return this.getSize()
            .lesserOrEquals(this.getFirst().getValue())
    }


    public toRange(): RangedSet<IPv4 | IPv6> {
        return new RangedSet(this.getFirst(), this.getLast());
    }

    public inside(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.toRange().inside(otherRange.toRange())
    }

    public contains(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.toRange().contains(otherRange.toRange());
    }

    public toRangeString(): string {
        return this.toRange().toRangeString();
    }

    public isOverlapping(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.toRange().isOverlapping(otherRange.toRange());
    }

    public isConsecutive(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.toRange().isConsecutive(otherRange.toRange());
    }

    public isCidrMergeable(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.isConsecutive(otherRange) && this.getSize().equals(otherRange.getSize());
    }

    public isMergeable(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.isCidrMergeable(otherRange)
            || this.contains(otherRange)
        || this.inside(otherRange);
    }

    public isEquals(otherRange: IPv6CidrRange | IPv4CidrRange): boolean {
        return this.toRange().isEquals(otherRange.toRange());
    }

    public merge(otherRange: IPv6CidrRange | IPv4CidrRange): IPv6CidrRange | IPv4CidrRange {
        if (!this.isCidrMergeable(otherRange)) {
            throw new Error(`Cannot merge. Ranges (${this.toRangeString()},${otherRange.toRangeString()}) are not consecutive and/or of same size`)
        }

        return this.newInstance(this.getFirst(), this.getPrefix().merge());
    }
    /**
     * Returns a lazily evaluated representation of the IP range that produces IP numbers by either:
     *
     * - iterating over using the for of syntax
     * - converting to array using spread syntax
     * - or assigning values to variables using deconstruction
     *
     * @param count the number of IP numbers to lazily evaluate.
     * If none is given, the whole IP range is lazily returned.
     */
    public *takeStream(count?: number): Iterable<IPv4 | IPv6> {
        return this.toRange().take(count);
    }

    *[Symbol.iterator](): Iterator<IPv4 | IPv6> {
        yield* this.toRange();
    }
}

/**
 * Represents a continuous segment of IPv4 numbers following the
 * classless inter-domain routing scheme for allocating IP addresses.
 *
 * @see https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
 */
export class IPv4CidrRange extends AbstractIPRange<IPv4, IPv4Prefix> {
    readonly bitValue: bigInt.BigInteger = bigInt(32);

    /**
     * Convenience method for constructing an instance of an IPv4CidrRange from an IP range represented in CIDR notation
     *
     * @param {string} rangeIncidrNotation the range of the IPv4 number in CIDR notation
     * @returns {IPv4CidrRange} the IPv4CidrRange
     */
    static fromCidr(rangeIncidrNotation:string):IPv4CidrRange {
        let [isValid, errorMessages] = Validator.isValidIPv4CidrNotation(rangeIncidrNotation);
        if (!isValid) {
            let messages = errorMessages.filter(message => {return message !== ''});
            throw new Error(messages.join(' and '));
        }
        let cidrComponents: Array<string> = rangeIncidrNotation.split("/");
        let ipString = cidrComponents[0];
        let prefix = parseInt(cidrComponents[1]);
        return new IPv4CidrRange(IPv4.fromDecimalDottedString(ipString), IPv4Prefix.fromNumber(prefix));
    };

    /**
     * Constructor for creating an instance of an IPv4 range.
     *
     * The arguments taken by the constructor is inspired by the CIDR notation which basically consists of the IP
     * number and the prefix.
     *
     * @param {IPv4} ipv4 the IP number used to construct the range. By convention this is the first IP number in
     * the range, but it could also be any IP number within the range
     * @param {IPv4Prefix} cidrPrefix the prefix which is a representation of the number of bits used to mask the
     * given IP number in other to create the range
     */
    constructor(private readonly ipv4: IPv4, readonly cidrPrefix: IPv4Prefix) {
        super();
    }

    /**
     * Gets the size of IPv4 numbers contained within the IPv4 range
     *
     * @returns {bigInt.BigInteger} the amount of IPv4 numbers in the range
     */
    public getSize(): bigInt.BigInteger {
        return this.cidrPrefix.toRangeSize();
    }

    /**
     * Method that returns the IPv4 range in CIDR (Classless Inter-Domain Routing) notation.
     *
     * See {@link https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#CIDR_notation} for more information
     * on the Classless Inter-Domain Routing notation
     *
     * @returns {string} the IPv4 range in CIDR (Classless Inter-Domain Routing) notation
     */
    public toCidrString(): string {
        let first = this.getFirst();
        return `${first.toString()}/${this.cidrPrefix.toString()}`
    }

    /**
     * Method that returns the IPv4 range in string notation where the first IPv4 number and last IPv4 number are
     * separated by an hyphen. eg. 192.198.0.0-192.198.0.255
     *
     * @returns {string} the range in [first IPv4 number] - [last IPv4 number] format
     */
    public toRangeString(): string {
        return super.toRangeString();
    }


    /**
     * Method that returns the first IPv4 number in the IPv4 range
     *
     * @returns {IPv4} the first IPv4 number in the IPv4 range
     */
    public getFirst(): IPv4 {
        return IPv4.fromBigInteger(this.ipv4.getValue().and(this.cidrPrefix.toSubnetMask().getValue()));
    }

    /**
     * Method that returns the last IPv4 number in the IPv4 range
     *
     * @returns {IPv4} the last IPv4 number in the IPv4 range
     */
    public getLast(): IPv4 {
        let onMask = bigInt("1".repeat(32), 2);
        let subnetAsBigInteger = this.cidrPrefix.toSubnetMask().getValue();
        let invertedSubnet = leftPadWithZeroBit(subnetAsBigInteger.xor(onMask).toString(2), 32);
        return IPv4.fromBigInteger(this.ipv4.getValue().or(parseBinaryStringToBigInteger(invertedSubnet)));
    }

    protected newInstance(num: IPv4, prefix: IPv4Prefix): IPv4CidrRange {
        return new IPv4CidrRange(num, prefix)
    }

    public getPrefix(): IPv4Prefix {
        return this.cidrPrefix;
    }

    /**
     * Indicates whether the given IPv4 range is an adjacent range.
     *
     * An adjacent range being one where the end of the given range, when incremented by one marks the start of the
     * other range. Or where the start of the given range, when decreased by one, marks the end of the other range
     *
     * @param {IPv4CidrRange} otherRange the other IPv4 range to compare with
     * @returns {boolean} true if the two IPv4 ranges are consecutive, false otherwise
     */
    public isConsecutive(otherRange: IPv4CidrRange): boolean {
        return super.isConsecutive(otherRange);
    }

    /**
     * Indicates if the given IPv4 range is a subset.
     *
     * By a subset range, it means all the values of the given range are contained by this IPv4 range
     *
     * @param {IPv4CidrRange} otherRange the other IPv4 range
     * @returns {boolean} true if the other Ipv4 range is a subset. False otherwise.
     */
    public contains(otherRange: IPv4CidrRange): boolean {
        return super.contains(otherRange);
    }

    /**
     * Indicate if the given range is a container range.
     *
     * By container range, it means all the IP number in this current range can be found within the given range.
     *
     * @param {IPv4CidrRange} otherRange he other IPv4 range
     * @returns {boolean} true if the other Ipv4 range is a container range. False otherwise.
     */
    public inside(otherRange: IPv4CidrRange): boolean {
        return super.inside(otherRange);
    }

    /**
     * Checks if two IPv4 ranges overlap
     * @param {IPv4CidrRange} otherRange the other IPv4 range
     * @returns {boolean} true if the ranges overlap, false otherwise
     */
    public isOverlapping(otherRange: IPv4CidrRange): boolean {
        return super.isOverlapping(otherRange);
    }

    /**
     * Method that takes IPv4 number from within an IPv4 range, starting from the first IPv4 number
     *
     * @param {number} count the amount of IPv4 number to take from the IPv4 range
     * @returns {Array<IPv4>} an array of IPv4 number, taken from the IPv4 range
     */
    public take(count: bigInt.BigInteger): Array<IPv4> {
        let ipv4s: Array<IPv4>  = [this.getFirst()];
        let iteratingIPv4 = this.getFirst();

        if (bigInt(count).greater(this.getSize())) {
            let errMessage = Validator.takeOutOfRangeSizeMessage
                .replace("$count", count.toString())
                .replace("$size", this.getSize().toString());
            throw new Error(errMessage);
        }

        for (var counter = 0; counter < count.minus(1).valueOf(); counter++) {
            ipv4s.push(iteratingIPv4.nextIPNumber());
            iteratingIPv4 = iteratingIPv4.nextIPNumber();
        }
        return ipv4s;
    }

    /**
     * Method that splits an IPv4 range into two halves
     *
     * @returns {Array<IPv4CidrRange>} An array of two {@link IPv4CidrRange}
     */
    public split() : Array<IPv4CidrRange> {
        let prefixToSplit = this.cidrPrefix.getValue();
        if (prefixToSplit === 32) {
            throw new Error("Cannot split an IP range with a single IP number");
        }
        let splitCidr = IPv4Prefix.fromNumber(prefixToSplit + 1);
        let firstIPOfFirstRange = this.getFirst();
        let firstRange = new IPv4CidrRange(firstIPOfFirstRange, splitCidr);
        let firstIPOfSecondRange = firstRange.getLast().nextIPNumber();
        let secondRange = new IPv4CidrRange(firstIPOfSecondRange, splitCidr);
        return [firstRange, secondRange];
    }

    /**
     * Returns true if there is an adjacent IPv4 cidr range of exactly the same size next to this range
     */
    public hasNextRange(): boolean {
        return super.hasNextRange();
    }

    /**
     * Returns true if there is an adjacent IPv4 cidr range of exactly the same size previous to this range
     */
    public hasPreviousRange(): boolean {
        return super.hasPreviousRange();
    }

    /**
     * Return the next IPv6 cidr range, or undefined if no next range
     */
    public nextRange(): IPv4CidrRange | undefined {
        if (this.hasNextRange()) {
            let sizeOfCurrentRange = this.getSize();
            let startOfNextRange = this.getFirst().getValue().plus(sizeOfCurrentRange);
            return new IPv4CidrRange(new IPv4(startOfNextRange), this.cidrPrefix)
        }

        return;
    }

    /**
     * Return the previous IPv6 cidr range, or undefined if no next range
     */
    public previousRange(): IPv4CidrRange | undefined {
        if (this.hasPreviousRange()) {
            let sizeOfCurrentRange = this.getSize();
            let startOfPreviousRange = this.getFirst().getValue().minus(sizeOfCurrentRange);
            return new IPv4CidrRange(new IPv4(startOfPreviousRange), this.cidrPrefix)
        }

        return;
    }
}


/**
 * Represents a continuous segment of IPv6 number following the
 * classless inter-domain routing scheme for allocating IP addresses.
 *
 * @see https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
 */
export class IPv6CidrRange extends AbstractIPRange<IPv6, IPv6Prefix> {
    readonly bitValue: bigInt.BigInteger = bigInt(128);

    /**
     * Convenience method for constructing an instance of an IPV6Range from an IP range represented in CIDR notation
     *
     * @param {string} rangeInCidrNotation the range of the IPv6 number in CIDR notation
     * @returns {IPv6CidrRange} the IPV6Range
     */
    static fromCidr(rangeInCidrNotation:string):IPv6CidrRange {
        let [isValid, message] = Validator.isValidIPv6CidrNotation(rangeInCidrNotation);
        if (!isValid) {
            throw new Error(message.filter(msg => {return msg !== '';}).toString());
        }
        let cidrComponents: Array<string> = rangeInCidrNotation.split("/");
        let ipString = cidrComponents[0];
        let prefix = parseInt(cidrComponents[1]);

        return new IPv6CidrRange(IPv6.fromHexadecimalString(ipString), IPv6Prefix.fromNumber(prefix));
    };

    /**
     * Constructor for creating an instance of an IPv6 range.
     *
     * The arguments taken by the constructor is inspired by the CIDR notation which basically consists of the IP
     * number and the prefix.
     *
     * @param {IPv6} ipv6 the IP number used to construct the range. By convention this is the first IP number in
     * the range, but it could also be any IP number within the range
     * @param {IPv6Prefix} cidrPrefix the prefix which is a representation of the number of bits used to mask the
     * given IPv6 number in other to create the range
     */
    constructor(private readonly ipv6: IPv6, readonly cidrPrefix: IPv6Prefix) {
        super();
    }

    /**
     * Gets the size of IPv6 numbers contained within the IPv6 range
     *
     * @returns {bigInt.BigInteger} the amount of IPv6 numbers in the range
     */
    public getSize(): bigInt.BigInteger {
        return this.cidrPrefix.toRangeSize();
    }

    /**
     * Method that returns the IPv6 range in CIDR (Classless Inter-Domain Routing) notation.
     *
     * See {@link https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#CIDR_notation} for more information
     * on the Classless Inter-Domain Routing notation
     *
     * @returns {string} the IPv6 range in CIDR (Classless Inter-Domain Routing) notation
     */
    public toCidrString(): string {
        let first = this.getFirst();
        return `${first.toString()}/${this.cidrPrefix.toString()}`
    }

    /**
     * Method that returns the IPv6 range in string notation where the first IPv6 number and last IPv6 number are
     * separated by an hyphen. eg. "2001:db8:0:0:0:0:0:0-2001:db8:0:ffff:ffff:ffff:ffff:ffff"
     *
     * @returns {string} the range in [first IPv6 number] - [last IPv6 number] format
     */
    public toRangeString(): string {
        return super.toRangeString();
    }

    /**
     * Method that returns the first IPv6 number in the IPv6 range
     *
     * @returns {IPv6} the first IPv6 number in the IPv6 range
     */
    public getFirst(): IPv6 {
        return IPv6.fromBigInteger(this.ipv6.getValue().and(this.cidrPrefix.toSubnetMask().getValue()));
    }

    /**
     * Method that returns the last IPv6 number in the IPv6 range
     *
     * @returns {IPv6} the last IPv6 number in the IPv6 range
     */
    public getLast(): IPv6 {
        let onMask = bigInt("1".repeat(128), 2);
        let subnetMaskAsBigInteger = this.cidrPrefix.toSubnetMask().getValue();
        let invertedSubnetMask = leftPadWithZeroBit(subnetMaskAsBigInteger.xor(onMask).toString(2), 128);
        return IPv6.fromBigInteger(this.ipv6.getValue().or(parseBinaryStringToBigInteger(invertedSubnetMask)));
    }

    protected newInstance(num: IPv6, prefix: IPv6Prefix): IPv6CidrRange {
        return new IPv6CidrRange(num, prefix)
    }

    public getPrefix(): IPv6Prefix {
        return this.cidrPrefix;
    }

    /**
     * Indicates whether the given IPv6 range is an adjacent range.
     *
     * An adjacent range being one where the end of the given range, when incremented by one marks the start of the
     * other range. Or where the start of the given range, when decreased by one, marks the end of the other range
     *
     * @param {IPv6CidrRange} otherRange the other IPv6 range to compare with
     * @returns {boolean} true if the two IPv6 ranges are consecutive, false otherwise
     */
    public isConsecutive(otherRange: IPv6CidrRange): boolean {
        return super.isConsecutive(otherRange);
    }

    /**
     * Indicates if the given IPv6 range is a subset.
     *
     * By a subset range, it means all the values of the given range are contained by this IPv6 range
     *
     * @param {IPv6CidrRange} otherRange the other IPv6 range
     * @returns {boolean} true if the other Ipv6 range is a subset. False otherwise.
     */
    public contains(otherRange: IPv6CidrRange): boolean {
        return super.contains(otherRange);
    }

    /**
     * Indicate if the given range is a container range.
     *
     * By container range, it means all the IP number in this current range can be found within the given range.
     *
     * @param {IPv6CidrRange} otherRange he other IPv6 range
     * @returns {boolean} true if the other Ipv6 range is a container range. False otherwise.
     */
    public inside(otherRange: IPv6CidrRange): boolean {
        return super.inside(otherRange);
    }

    /**
     * Checks if two IPv6 ranges overlap
     * @param {IPv6CidrRange} otherRange the other IPv6 range
     * @returns {boolean} true if the ranges overlap, false otherwise
     */
    public isOverlapping(otherRange: IPv6CidrRange): boolean {
        return super.isOverlapping(otherRange);
    }

    /**
     * Method that takes IPv6 number from within an IPv6 range, starting from the first IPv6 number
     *
     * @param {number} count the amount of IPv6 number to take from the IPv6 range
     * @returns {Array<IPv6>} an array of IPv6 number, taken from the IPv6 range
     */
    public take(count: bigInt.BigInteger): Array<IPv6> {
        let iPv6s: Array<IPv6>  = [this.getFirst()];
        let iteratingIPv6 = this.getFirst();

        if (count.greater(this.getSize())) {
            throw new Error(`${count.toString()} is greater than ${this.getSize().toString()}, the size of the range`);
        }

        for (var counter = 0; counter < count.minus(1).valueOf(); counter++) {
            iPv6s.push(iteratingIPv6.nextIPNumber());
            iteratingIPv6 = iteratingIPv6.nextIPNumber();
        }
        return iPv6s;
    }

    /**
     * Method that splits an IPv6 cidr range into two halves
     *
     * @returns {Array<IPv6CidrRange>} An array of two {@link IPv6CidrRange}
     */
    public split() : Array<IPv6CidrRange> {
        let prefixToSplit = this.cidrPrefix.getValue();
        if (prefixToSplit === 128) {
            throw new Error("Cannot split an IP range with a single IP number");
        }
        let splitCidr = IPv6Prefix.fromNumber(prefixToSplit + 1);
        let firstIPOfFirstRange = this.getFirst();
        let firstRange = new IPv6CidrRange(firstIPOfFirstRange, splitCidr);
        let firstIPOfSecondRange = firstRange.getLast().nextIPNumber();
        let secondRange = new IPv6CidrRange(firstIPOfSecondRange, splitCidr);
        return [firstRange, secondRange];
    }

    /**
     * Returns true if there is an adjacent IPv6 cidr range of exactly the same size next to this range
     */
    public hasNextRange(): boolean {
        return super.hasNextRange();
    }

    /**
     * Returns true if there is an adjacent IPv6 cidr range of exactly the same size previous to this range
     */
    public hasPreviousRange(): boolean {
        return super.hasPreviousRange();
    }

    /**
     * Return the next IPv6 cidr range, or undefined if no next range
     */
    public nextRange(): IPv6CidrRange | undefined {
        if (this.hasNextRange()) {
            let sizeOfCurrentRange = this.getSize();
            let startOfNextRange = this.getFirst().getValue().plus(sizeOfCurrentRange);
            return new IPv6CidrRange(new IPv6(startOfNextRange), this.cidrPrefix)
        }
        return;
    }

    /**
     * Return the previous IPv6 cidr range, or undefined if no next range
     */
    public previousRange(): IPv6CidrRange | undefined {
        if (this.hasPreviousRange()) {
            let sizeOfCurrentRange = this.getSize();
            let startOfPreviousRange = this.getFirst().getValue().minus(sizeOfCurrentRange);
            return new IPv6CidrRange(new IPv6(startOfPreviousRange), this.cidrPrefix)
        }
        return;
    }
}