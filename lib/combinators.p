def id : {-t : *} -> t -> t = \x. x
def const : {-a -b : *} -> a -> b -> a = \x y. x
def constid : {-a -b : *} -> a -> b -> b = \x y. y
def flip : {-a -b -c : *} -> (a -> b -> c) -> b -> a -> c = \f x y. f y x
def compose : {-a -b -c : *} -> (b -> c) -> (a -> b) -> a -> c = \f g x. f (g x)
def dup : {-a -b : *} -> (a -> a -> b) -> a -> b = \f x. f x x
def apply : {-a -b : *} -> (a -> b) -> a -> b = \f x. f x
def trush : {-a -b : *} -> a -> (a -> b) -> b = \x f. f x
def sapply : {-a -b -c : *} -> (a -> b -> c) -> (a -> b) -> a -> c = \f g x. f x (g x)
def fork : {-a -b -c -d : *} -> (a -> b -> c) -> (d -> a) -> (d -> b) -> d -> c = \f g h x. f (g x) (h x)
