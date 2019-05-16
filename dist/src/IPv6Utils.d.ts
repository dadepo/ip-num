/**
 * Expands an IPv6 number in abbreviated format into its full form
 *
 * {@see https://en.wikipedia.org/wiki/IPv6_address#Representation} for more on the representation of IPv6 addresses
 *
 * @param {string} ipv6String the abbreviated IPv6 address to expand
 * @returns {string} the expanded IPv6 address
 */
export declare let expandIPv6Number: (ipv6String: string) => string;
/**
 * Collapses an IPv6 number in full format into its abbreviated form
 *
 * {@see https://en.wikipedia.org/wiki/IPv6_address#Representation} for more on the representation of IPv6 addresses
 *
 * @param {string} ipv6String the full form IPv6 number to collapse
 * @returns {string} the collapsed IPv6 number
 */
export declare let collapseIPv6Number: (ipv6String: string) => string;
/**
 * Converts a given IPv6 number expressed in the hexadecimal string notation into a 16 bit binary number in string
 * @param {string} hexadectetString the IPv6 number
 * @returns {string} the IPv6 number converted to binary string
 */
export declare let hexadectetNotationToBinaryString: (hexadectetString: string) => string;
