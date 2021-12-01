The Token Balance Oracle is an ACL Oracle that checks if an address holds a minimum required balance of a certain token.

When performing an action on an installed Aragon App, if the function to execute is protected with a ROLE which is parameterized with this ACL Oracle, the Oracle will check if the address has the minimum required balance. In the case the outcome is positive, the address is permitted to execute the function.

**WARNING**

The code in this repo has not been audited.
