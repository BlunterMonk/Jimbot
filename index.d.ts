declare interface String {
    similarity (s1, s2): any;
    toTitleCase (splitter): string;
    replaceAll (search, replacement): string;
    capitalize (): string
    limitTo (limit): string;
    empty (): boolean;
    indexOfAfter (search, start): string;
    indexOfAfterIndex (search, start): string;
    matches (other): boolean;
}
